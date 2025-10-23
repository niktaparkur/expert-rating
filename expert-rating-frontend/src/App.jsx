import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Epic,
  Tabbar,
  TabbarItem,
  SplitLayout,
  SplitCol,
  View,
  AppRoot,
  ModalRoot,
  ModalCard,
  FormItem,
  FormField,
  Input,
  Button,
  ScreenSpinner,
  Spinner,
  ModalPage,
  ModalPageHeader,
  Group,
  Header,
  Checkbox,
  Search,
  Div,
  PanelHeaderBack,
  Text
} from "@vkontakte/vkui";
import {
  useActiveVkuiLocation,
  useRouteNavigator,
  useSearchParams,
} from "@vkontakte/vk-mini-apps-router";
import {
  Icon28ArticleOutline,
  Icon28CompassOutline,
  Icon28MoneyCircleOutline,
  Icon28UserCircleOutline,
  Icon24CheckCircleFilledBlue,
  Icon28CheckShieldOutline,
} from "@vkontakte/icons";
import bridge from "@vkontakte/vk-bridge";
import debounce from "lodash.debounce";
import { Onboarding } from "./components/Onboarding.tsx";
import { useApi } from "./hooks/useApi.js";
import {
  Home,
  Registration,
  Admin,
  Afisha,
  CreateEvent,
  Voting,
  ExpertProfile,
  Tariffs,
  Profile,
} from "./panels";
import {
  VIEW_MAIN,
  VIEW_AFISHA,
  VIEW_TARIFFS,
  VIEW_PROFILE,
  PANEL_HOME,
  PANEL_REGISTRATION,
  PANEL_AFISHA,
  PANEL_ADMIN,
  PANEL_VOTING,
  PANEL_EXPERT_PROFILE,
  PANEL_TARIFFS,
  PANEL_PROFILE,
} from "./routes";

export const App = () => {
  const { view: activeView = VIEW_MAIN, panel: activePanel = PANEL_HOME } =
    useActiveVkuiLocation();
  const routeNavigator = useRouteNavigator();
  const { apiGet, apiPost } = useApi();
  const [popout, setPopout] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [promoWord, setPromoWord] = useState("");
  const [snackbar, setSnackbar] = useState(null);
  const [searchParams] = useSearchParams();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const hasLaunchParams = searchParams.toString().length > 0;
  const [promoStatus, setPromoStatus] = useState(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [allThemes, setAllThemes] = useState([]);
  const [selectedThemeIds, setSelectedThemeIds] = useState([]);

  useEffect(() => {
    apiGet("/meta/themes")
      .then(setAllThemes)
      .catch((e) => console.error("Failed to load themes", e));
  }, [apiGet]);

  const handleTopicChange = (e, themeId) => {
    const { checked } = e.target;
    if (checked) {
      if (selectedThemeIds.length < 3)
        setSelectedThemeIds([...selectedThemeIds, themeId]);
    } else {
      setSelectedThemeIds(selectedThemeIds.filter((id) => id !== themeId));
    }
  };

  const isTopicSelectionValid =
    selectedThemeIds.length >= 1 && selectedThemeIds.length <= 3;

  const filteredTopics = useMemo(() => {
    if (!allThemes) return [];
    if (!searchQuery) return allThemes;
    const lowerQuery = searchQuery.toLowerCase();
    return allThemes
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.name.toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery, allThemes]);

  const checkPromo = useCallback(
    debounce(async (word) => {
      const normalizedWord = word.trim().toUpperCase();
      if (!normalizedWord || normalizedWord.length < 4) {
        setPromoStatus(null);
        setIsCheckingPromo(false);
        return;
      }
      setIsCheckingPromo(true);
      try {
        const response = await apiGet(`/events/status/${normalizedWord}`);
        setPromoStatus(response);
      } catch (error) {
        console.error("Promo check failed:", error);
        setPromoStatus({ status: "error" });
      } finally {
        setIsCheckingPromo(false);
      }
    }, 500),
    [apiGet],
  );

  useEffect(() => {
    if (activeModal === "promo-vote-modal") {
      checkPromo(promoWord);
    }
  }, [promoWord, checkPromo, activeModal]);

  const handlePromoWordChange = (e) => {
    setPromoWord(e.target.value);
  };

  const getPromoBottomText = () => {
    if (isCheckingPromo)
      return <Spinner size="s" style={{ alignSelf: "center" }} />;
    if (!promoStatus) return null;
    switch (promoStatus.status) {
      case "active":
        return (
          <span style={{ color: "var(--vkui--color_text_positive)" }}>
            Мероприятие найдено и активно!
          </span>
        );
      case "not_started":
        const startTime = new Date(promoStatus.start_time).toLocaleString(
          "ru-RU",
          { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" },
        );
        return `Голосование еще не началось. Начало: ${startTime}`;
      case "finished":
        return "Голосование по этому слову уже завершилось.";
      case "not_found":
        return (
          <span style={{ color: "var(--vkui--color_text_negative)" }}>
            Мероприятие с таким словом не найдено.
          </span>
        );
      case "error":
        return (
          <span style={{ color: "var(--vkui--color_text_negative)" }}>
            Ошибка проверки. Попробуйте еще раз.
          </span>
        );
      default:
        return null;
    }
  };

  const refetchUser = useCallback(async () => {
    try {
      const userData = await apiGet("/users/me");
      setCurrentUser(userData);
    } catch (error) {
      console.error("Failed to refetch user:", error);
    }
  }, [apiGet]);

  useEffect(() => {
    const handleAppEvents = (e) => {
      if (e.detail.type === "VKWebAppViewRestore") {
        refetchUser();
      }
    };
    bridge.subscribe(handleAppEvents);
    return () => bridge.unsubscribe(handleAppEvents);
  }, [refetchUser]);

  useEffect(() => {
    const initApp = async () => {
      let onboardingNeeded = true;
      if (!hasLaunchParams) {
        try {
          const result = await bridge.send("VKWebAppStorageGet", {
            keys: ["onboardingFinished"],
          });
          const onboardingFinished =
            result.keys.find((k) => k.key === "onboardingFinished")?.value ===
            "true";
          if (onboardingFinished) onboardingNeeded = false;
        } catch (e) {
          console.warn(
            "VK Storage check failed, falling back to localStorage",
            e,
          );
          if (localStorage.getItem("onboardingFinished"))
            onboardingNeeded = false;
        }
      } else {
        onboardingNeeded = false;
      }

      if (onboardingNeeded) {
        setShowOnboarding(true);
        setIsLoadingApp(false);
        return;
      }

      try {
        const userData = await apiGet("/users/me");
        if (userData) {
          setCurrentUser(userData);
        } else {
          const vkUser = await bridge.send("VKWebAppGetUserInfo");
          const newUserPayload = {
            vk_id: vkUser.id,
            first_name: vkUser.first_name,
            last_name: vkUser.last_name,
            photo_url: vkUser.photo_200,
          };
          const registeredUser = await apiPost(
            "/users/register",
            newUserPayload,
          );
          setCurrentUser(registeredUser);
        }
      } catch (error) {
        console.error(
          "Fatal: A critical error occurred during initialization:",
          error,
        );
      } finally {
        setIsLoadingApp(false);
      }
    };
    initApp();
  }, [apiGet, apiPost, hasLaunchParams]);

  const finishOnboarding = async () => {
    try {
      await bridge.send("VKWebAppStorageSet", {
        key: "onboardingFinished",
        value: "true",
      });
    } catch (error) {
      localStorage.setItem("onboardingFinished", "true");
    }
    setShowOnboarding(false);
    window.location.reload();
  };

  const onStoryChange = (e) => {
    const story = e.currentTarget.dataset.story;
    if (story === VIEW_MAIN) routeNavigator.push("/");
    if (story === VIEW_AFISHA) routeNavigator.push("/afisha");
    if (story === VIEW_TARIFFS) routeNavigator.push("/tariffs");
    if (story === VIEW_PROFILE) routeNavigator.push("/profile");
  };

  const goToVoteByPromo = () => {
    if (promoStatus?.status === "active") {
      setActiveModal(null);
      routeNavigator.push(`/vote/${promoWord.trim().toUpperCase()}`);
    }
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalCard
        id="promo-vote-modal"
        onClose={() => setActiveModal(null)}
        header="Голосование"
      >
        <FormItem
          top={
            <Text style={{paddingBottom: "5px"}}>
              Введите промо-слово или наведите камеру на QR-код
            </Text>
          }
          bottom={getPromoBottomText()}
          status={
            promoStatus?.status === "not_found" ||
            promoStatus?.status === "error"
              ? "error"
              : "default"
          }
        >
          <FormField>
            <Input value={promoWord} onChange={handlePromoWordChange} />
          </FormField>
        </FormItem>
        <FormItem>
          <Button
            size="l"
            stretched
            onClick={goToVoteByPromo}
            disabled={promoStatus?.status !== "active"}
          >
            Проголосовать
          </Button>
        </FormItem>
      </ModalCard>

      <ModalPage
        id="topics-modal"
        onClose={() => setActiveModal(null)}
        header={
          <ModalPageHeader
            before={<PanelHeaderBack onClick={() => setActiveModal(null)} />}
          >
            <div style={{ padding: "0 8px", width: "100%" }}>
              <Search
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по темам"
              />
            </div>
          </ModalPageHeader>
        }
        footer={
          isTopicSelectionValid && (
            <Div>
              <Button size="l" stretched onClick={() => setActiveModal(null)}>
                Сохранить
              </Button>
            </Div>
          )
        }
        settlingHeight={100}
      >
        <Group>
          {filteredTopics.map((group) => (
            <div key={group.name}>
              <Header>{group.name}</Header>
              {group.items.map((item) => (
                <Checkbox
                  key={item.id}
                  checked={selectedThemeIds.includes(item.id)}
                  onChange={(e) => handleTopicChange(e, item.id)}
                  disabled={
                    selectedThemeIds.length >= 3 &&
                    !selectedThemeIds.includes(item.id)
                  }
                >
                  {item.name}
                </Checkbox>
              ))}
            </div>
          ))}
          {filteredTopics.length === 0 && <Div>Ничего не найдено</Div>}
        </Group>
      </ModalPage>
      <CreateEvent
        id="create-event-modal"
        user={currentUser}
        setPopout={setPopout}
        onClose={() => setActiveModal(null)}
        afterCreate={() => refetchUser()}
      />
    </ModalRoot>
  );

  if (isLoadingApp) return <ScreenSpinner state="loading" />;
  if (showOnboarding) return <Onboarding onFinish={finishOnboarding} />;

  const renderTabbar = () => {
    return (
      <Tabbar>
        <TabbarItem
          onClick={onStoryChange}
          selected={activeView === VIEW_MAIN}
          data-story={VIEW_MAIN}
          label="Рейтинг"
        >
          <Icon28ArticleOutline />
        </TabbarItem>
        <TabbarItem
          onClick={onStoryChange}
          selected={activeView === VIEW_AFISHA}
          data-story={VIEW_AFISHA}
          label="Афиша"
        >
          <Icon28CompassOutline />
        </TabbarItem>
        <TabbarItem
          onClick={() => setActiveModal("promo-vote-modal")}
          style={{
            background: "var(--vkui--color_background_accent)",
            borderRadius: "12px",
            color: "white",
            whiteSpace: "normal",
            lineHeight: 1.2,
            fontSize: "10px",
          }}
          label="Голосовать"
        >
          <Icon24CheckCircleFilledBlue />
        </TabbarItem>
        <TabbarItem
          onClick={onStoryChange}
          selected={activeView === VIEW_TARIFFS}
          data-story={VIEW_TARIFFS}
          label="Тарифы"
        >
          <Icon28MoneyCircleOutline />
        </TabbarItem>
        <TabbarItem
          onClick={onStoryChange}
          selected={activeView === VIEW_PROFILE}
          data-story={VIEW_PROFILE}
          label="Аккаунт"
        >
          <Icon28UserCircleOutline />
        </TabbarItem>
        {currentUser?.is_admin && (
          <TabbarItem
            onClick={() => routeNavigator.push("/admin")}
            selected={activePanel === PANEL_ADMIN}
            label="Админка"
          >
            <Icon28CheckShieldOutline />
          </TabbarItem>
        )}
      </Tabbar>
    );
  };

  return (
    <AppRoot>
      <SplitLayout popout={popout} modal={modal}>
        <SplitCol>
          <Epic activeStory={activeView} tabbar={renderTabbar()}>
            <View id={VIEW_MAIN} activePanel={activePanel}>
              <Home id={PANEL_HOME} user={currentUser} />
              <Registration
                id={PANEL_REGISTRATION}
                user={currentUser}
                refetchUser={refetchUser}
                selectedThemeIds={selectedThemeIds}
                onOpenTopicsModal={() => setActiveModal("topics-modal")}
              />
              <Voting
                id={PANEL_VOTING}
                setPopout={setPopout}
                setSnackbar={setSnackbar}
                user={currentUser}
                refetchUser={refetchUser}
              />
              <ExpertProfile
                id={PANEL_EXPERT_PROFILE}
                setPopout={setPopout}
                setSnackbar={setSnackbar}
                user={currentUser}
                refetchUser={refetchUser}
              />
              <Admin
                id={PANEL_ADMIN}
                setPopout={setPopout}
                setSnackbar={setSnackbar}
              />
            </View>
            <View id={VIEW_AFISHA} activePanel={activePanel}>
              <Afisha id={PANEL_AFISHA} user={currentUser} />
            </View>
            <View id={VIEW_TARIFFS} activePanel={activePanel}>
              <Tariffs
                id={PANEL_TARIFFS}
                user={currentUser}
                setPopout={setPopout}
                setSnackbar={setSnackbar}
                refetchUser={refetchUser}
              />
            </View>
            <View id={VIEW_PROFILE} activePanel={activePanel}>
              <Profile
                id={PANEL_PROFILE}
                user={currentUser}
                setCurrentUser={setCurrentUser}
                refetchUser={refetchUser}
                setPopout={setPopout}
                setSnackbar={setSnackbar}
                onOpenCreateEventModal={() => setActiveModal("create-event-modal")}
              />
            </View>
          </Epic>
        </SplitCol>
      </SplitLayout>
      {snackbar &&
        React.cloneElement(snackbar, {
          style: { ...snackbar.props.style, zIndex: 1000 },
        })}
    </AppRoot>
  );
};
