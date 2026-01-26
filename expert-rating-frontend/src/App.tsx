import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
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
  Search,
  Div,
  PanelHeaderBack,
  Text,
  Snackbar,
  Alert,
  SimpleCell,
  Switch,
  usePlatform,
  Checkbox,
  Panel,
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
  Icon16Done,
  Icon16Cancel,
  Icon56CheckCircleOutline,
  Icon28EditOutline,
} from "@vkontakte/icons";
import bridge from "@vkontakte/vk-bridge";
import debounce from "lodash.debounce";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { Onboarding } from "./components/Shared/Onboarding";
import { LegalConsent } from "./components/Shared/LegalConsent";
import { LEGAL_DOCUMENTS } from "./data/legalDocuments";
import { CreateMailingModal } from "./components/CreateMailingModal";
import { EventActionModal } from "./components/Event/EventActionModal";
import { QrCodeModal } from "./components/Event/QrCodeModal";
import { AfishaEventModal } from "./components/Afisha/AfishaEventModal";
import { FiltersModal } from "./components/Shared/FiltersModal";
import { PurchaseModal } from "./components/Shared/PurchaseModal";
import { MobilePaymentStubModal } from "./components/Shared/MobilePaymentStubModal";
import { EditProfileModal } from "./components/Profile/EditProfileModal";
import { SelectModal, Option } from "./components/Shared/SelectModal";
import { useApi } from "./hooks/useApi";
import { useUserStore } from "./store/userStore";
import { useUiStore } from "./store/uiStore";
import { VoteCard } from "./components/Vote/VoteCard";
import { Platform } from "@vkontakte/vkui";
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
import { EventData, UserData } from "./types";
import "./styles/global.css";

const GROUP_ID = Number(import.meta.env.VITE_VK_GROUP_ID);
const TARIFF_MAILING_LIMITS: { [key: string]: number } = {
  Начальный: 1,
  Стандарт: 2,
  Профи: 4,
};

const ENABLE_MAILINGS = false;

const PopoutWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        zIndex: 1001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.4)",
      }}
    >
      {children}
    </div>
  );
};

export const App = () => {
  const platform = usePlatform();
  const routeNavigator = useRouteNavigator();
  const { apiGet, apiPost, apiPut, apiDelete } = useApi();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const { view: activeView = VIEW_MAIN, panel: activePanel = PANEL_HOME } =
    useActiveVkuiLocation();
  const hasLaunchParams = searchParams.toString().length > 0;
  const isMobilePlatform = platform === "ios" || platform === "android";

  const isMobile = platform === Platform.IOS || platform === Platform.ANDROID;


  const { currentUser, setCurrentUser } = useUserStore();
  const {
    activeModal,
    popout,
    snackbar,
    setActiveModal,
    setPopout,
    setSnackbar,
    targetExpertId,
  } = useUiStore();

  const [promoInput, setPromoInput] = useState("");
  const [promoCheckResult, setPromoCheckResult] = useState<any | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const [topicSearchQuery, setTopicSearchQuery] = useState("");
  const [themeCategories, setThemeCategories] = useState<any[]>([]);
  const [activeThemeIds, setActiveThemeIds] = useState<number[]>([]);

  const [interactionEvent, setInteractionEvent] = useState<EventData | null>(
    null,
  );
  const [dailyMailingsSent, setDailyMailingsSent] = useState(0);
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);

  const [selectModalState, setSelectModalState] = useState<{
    title: string;
    options: Option[];
    selected: string | number | null;
    onSelect: (value: string | number) => void;
    searchable?: boolean;
    fallbackModal?: string | null;
  } | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLegalConsent, setShowLegalConsent] = useState(false);
  const [isAppInitializing, setIsAppInitializing] = useState(true);

  const { data: regionList = [] } = useQuery({
    queryKey: ["metaRegions"],
    queryFn: () => apiGet<string[]>("/meta/regions"),
  });

  useEffect(() => {
    apiGet<any[]>("/meta/themes")
      .then(setThemeCategories)
      .catch((e) => console.error("Failed to load themes", e));
  }, [apiGet]);

  const openEventActionModal = (event: EventData) => {
    setInteractionEvent(event);
    if (activeView === VIEW_AFISHA) {
      setActiveModal("afisha-event-details");
    } else {
      setActiveModal("event-actions-modal");
    }
  };

  const requestReportPurchase = (expertId: number) => {
    setReportTargetId(expertId);
    if (isMobilePlatform) {
      setActiveModal("mobile-payment-stub");
      return;
    }

    if (currentUser && !currentUser.allow_notifications) {
      bridge
        .send("VKWebAppAllowMessagesFromGroup", { group_id: GROUP_ID })
        .then((data) => {
          if (data.result) {
            apiPut("/users/me/settings", { allow_notifications: true }).then(
              () => queryClient.invalidateQueries({ queryKey: ["user", "me"] }),
            );
            setActiveModal("report-purchase-modal");
          } else {
            setSnackbar(
              <Snackbar
                onClose={() => setSnackbar(null)}
                before={<Icon16Cancel />}
              >
                Для получения отчета нужны разрешения на сообщения.
              </Snackbar>,
            );
          }
        })
        .catch(() => {
          setSnackbar(
            <Snackbar
              onClose={() => setSnackbar(null)}
              before={<Icon16Cancel />}
            >
              Ошибка доступа к сообщениям.
            </Snackbar>,
          );
        });
    } else {
      setActiveModal("report-purchase-modal");
    }
  };

  const processReportPayment = async ({ email }: { email: string }) => {
    if (!reportTargetId) return;
    setActiveModal(null);
    setPopout(<Spinner size="l" />);
    try {
      if (currentUser?.email !== email) {
        const updatedUser = await apiPut<UserData>("/users/me/email", {
          email,
        });
        setCurrentUser(updatedUser);
      }
      const response = await apiPost<{ confirmation_url: string }>(
        `/payment/reports/${reportTargetId}/create-payment`,
        {},
      );
      if (response.confirmation_url) {
        window.open(response.confirmation_url, "_blank");
        setSnackbar(
          <Snackbar duration={7000} onClose={() => setSnackbar(null)}>
            После успешной оплаты отчет будет отправлен вам в личные сообщения
            ВКонтакте.
          </Snackbar>,
        );
      }
    } catch (err) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };

  const submitProfileUpdate = async (profileData: any) => {
    try {
      await apiPost("/experts/me/update_profile", profileData);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Заявка на обновление профиля отправлена на модерацию.
        </Snackbar>,
      );
    } catch (error: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {error.message || "Ошибка обновления"}
        </Snackbar>,
      );
    }
  };

  const configureSelectModal = (
    title: string,
    options: Option[],
    selected: string | number | null,
    onSelect: (val: any) => void,
    searchable = false,
    fallbackModal: string | null = null,
  ) => {
    setSelectModalState({
      title,
      options,
      selected,
      onSelect,
      searchable,
      fallbackModal,
    });
    setActiveModal("select-modal");
  };

  const handleShareEvent = () => {
    if (!interactionEvent) return;
    const link = `https://vk.com/app${import.meta.env.VITE_VK_APP_ID}#/vote/${interactionEvent.promo_word}`;

    bridge.send("VKWebAppShare", { link }).catch((error) => {
      if (error.error_data?.error_code !== 4) {
        console.error("VKWebAppShare error:", error);
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
            Ошибка при попытке поделиться.
          </Snackbar>,
        );
      }
    });
    setActiveModal(null);
  };

  const executeDeleteEvent = async () => {
    if (!interactionEvent) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiDelete(`/events/${interactionEvent.id}`);
      await queryClient.invalidateQueries({
        queryKey: ["myEvents", currentUser?.vk_id],
      });
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Мероприятие удалено.
        </Snackbar>,
      );
    } catch (err) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };

  const confirmDeleteEvent = () => {
    setActiveModal(null);
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Удалить",
            mode: "destructive",
            action: executeDeleteEvent,
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение"
        description="Вы уверены, что хотите удалить это мероприятие? Действие необратимо."
      />,
    );
  };

  const executeStopEvent = async () => {
    if (!interactionEvent) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiPost(`/events/${interactionEvent.id}/stop`, {});
      await queryClient.invalidateQueries({
        queryKey: ["myEvents", currentUser?.vk_id],
      });
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Прием голосов остановлен.
        </Snackbar>,
      );
    } catch (err) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };

  const confirmStopEvent = () => {
    setActiveModal(null);
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Остановить",
            mode: "destructive",
            action: executeStopEvent,
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение"
        description="Вы уверены, что хотите остановить прием голосов? После этого запустить его снова будет невозможно."
      />,
    );
  };

  const updateUserSettings = async (fieldName: string, value: boolean) => {
    if (!currentUser) return;
    setPopout(<Spinner size="xl" />);
    const payload = { [fieldName]: value };

    if (fieldName === "allow_notifications" && !value) {
      payload.allow_expert_mailings = false;
    }

    try {
      const updatedUser = await apiPut<UserData>("/users/me/settings", payload);
      setCurrentUser({ ...currentUser, ...updatedUser });
    } catch (err) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
      await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    } finally {
      setPopout(null);
    }
  };

  const promoLength = promoInput.trim().length;

  const isPromoLengthError = promoLength > 0 && (promoLength < 4 || promoLength > 20);

  const isPromoErrorState =
    isPromoLengthError ||
    promoCheckResult?.status === "not_found" ||
    promoCheckResult?.status === "error";

  const getPromoBottomText = () => {
    if (isPromoLengthError) return "Код должен содержать от 4 до 20 символов";
    return getPromoStatusMessage();
  };

  const toggleNotificationSettings = async (
    fieldName: "allow_notifications" | "allow_expert_mailings",
    value: boolean,
  ) => {
    if (fieldName === "allow_expert_mailings") {
      await updateUserSettings(fieldName, value);
      return;
    }

    if (value) {
      if (bridge.isWebView()) {
        try {
          const result = await bridge.send("VKWebAppAllowMessagesFromGroup", {
            group_id: GROUP_ID,
          });
          if (result.result) {
            await updateUserSettings(fieldName, true);
          } else {
            await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
          }
        } catch (error) {
          await queryClient.invalidateQueries({ queryKey: ["user", "me"] });
          setSnackbar(
            <Snackbar
              onClose={() => setSnackbar(null)}
              before={<Icon16Cancel />}
            >
              Не удалось запросить разрешение на уведомления.
            </Snackbar>,
          );
        }
      } else {
        await updateUserSettings(fieldName, value);
      }
    } else {
      await updateUserSettings(fieldName, false);
    }
  };

  const refetchUser = useCallback(async () => {
    try {
      const userData = await apiGet<UserData>("/users/me");
      setCurrentUser(userData);
    } catch (error) {
      console.error("Failed to refetch user:", error);
    }
  }, [apiGet, setCurrentUser]);

  const toggleTopicSelection = (
    e: React.ChangeEvent<HTMLInputElement>,
    themeId: number,
  ) => {
    const { checked } = e.target;
    if (checked) {
      if (activeThemeIds.length < 3) {
        setActiveThemeIds([...activeThemeIds, themeId]);
      }
    } else {
      setActiveThemeIds(activeThemeIds.filter((id) => id !== themeId));
    }
  };

  const isTopicSelectionValid =
    activeThemeIds.length >= 1 && activeThemeIds.length <= 3;

  const filteredTopicGroups = useMemo(() => {
    if (!themeCategories) return [];
    if (!topicSearchQuery) return themeCategories;
    const lowerQuery = topicSearchQuery.toLowerCase();
    return themeCategories
      .map((group) => ({
        ...group,
        items: group.items.filter((item: any) =>
          item.name.toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [topicSearchQuery, themeCategories]);

  const validatePromoCode = useCallback(
    debounce(async (word: string) => {
      const normalizedWord = word.trim().toUpperCase();
      if (!normalizedWord || !/^[A-Z0-9А-ЯЁ]{4,}$/i.test(normalizedWord)) {
        setPromoCheckResult(null);
        setIsValidatingPromo(false);
        return;
      }
      setIsValidatingPromo(true);
      try {
        const response = await apiGet(`/events/status/${normalizedWord}`);
        setPromoCheckResult(response);
      } catch (error) {
        console.error("Promo check failed:", error);
        setPromoCheckResult({ status: "error" });
      } finally {
        setIsValidatingPromo(false);
      }
    }, 500),
    [apiGet],
  );

  useEffect(() => {
    if (activeModal === "promo-vote-modal") {
      validatePromoCode(promoInput);
    }
  }, [promoInput, validatePromoCode, activeModal]);

  const getPromoStatusMessage = () => {
    if (isValidatingPromo) {
      return <Spinner size="s" style={{ alignSelf: "center" }} />;
    }
    if (!promoCheckResult) return null;

    switch (promoCheckResult.status) {
      case "active":
        return (
          <span style={{ color: "var(--vkui--color_text_positive)" }}>
            Мероприятие найдено и активно!
          </span>
        );
      case "not_started":
        const startTime = new Date(promoCheckResult.start_time).toLocaleString(
          "ru-RU",
          {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          },
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

  useEffect(() => {
    const handleAppEvents = (e: any) => {
      if (e.detail.type === "VKWebAppViewRestore") {
        refetchUser();
      }
    };
    bridge.subscribe(handleAppEvents);
    return () => bridge.unsubscribe(handleAppEvents);
  }, [refetchUser]);

  const acceptLegalTerms = async () => {
    try {
      await bridge.send("VKWebAppStorageSet", {
        key: "legalAccepted_v1",
        value: "true",
      });
    } catch (error) {
      localStorage.setItem("legalAccepted_v1", "true");
    }
    setShowLegalConsent(false);
  };

  const openLegalDocument = (
    docType: "offer" | "user_agreement" | "privacy" | "mailing_consent",
  ) => {
    const url = LEGAL_DOCUMENTS[docType].url;
    if (url) {
      window.open(url, "_blank");
    } else {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Ссылка на документ не найдена.
        </Snackbar>,
      );
    }
  };

  useEffect(() => {
    const initApp = async () => {
      let legalNeeded = true;
      let onboardingNeeded = true;

      try {
        const result = await bridge.send("VKWebAppStorageGet", {
          keys: ["legalAccepted_v1"],
        });
        const legalAccepted =
          result.keys.find((k) => k.key === "legalAccepted_v1")?.value ===
          "true";
        if (legalAccepted) legalNeeded = false;
      } catch (e) {
        if (localStorage.getItem("legalAccepted_v1")) legalNeeded = false;
      }

      if (legalNeeded) {
        setShowLegalConsent(true);
        setIsAppInitializing(false);
        return;
      }

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
          if (localStorage.getItem("onboardingFinished"))
            onboardingNeeded = false;
        }
      } else {
        onboardingNeeded = false;
      }

      if (onboardingNeeded) {
        setShowOnboarding(true);
        setIsAppInitializing(false);
        return;
      }

      try {
        const userData = await apiGet<UserData>("/users/me");
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
          const registeredUser = await apiPost<UserData>(
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
        setIsAppInitializing(false);
      }
    };
    initApp();
  }, [apiGet, apiPost, hasLaunchParams, setCurrentUser, showLegalConsent]);

  const completeOnboarding = async () => {
    try {
      await bridge.send("VKWebAppStorageSet", {
        key: "onboardingFinished",
        value: "true",
      });
    } catch (error) {
      localStorage.setItem("onboardingFinished", "true");
    }
    setShowOnboarding(false);
    setIsAppInitializing(true);
    window.location.reload();
  };

  const navigateToView = (e: React.MouseEvent<HTMLElement>) => {
    const story = e.currentTarget.dataset.story;
    if (story === VIEW_MAIN) routeNavigator.push("/");
    if (story === VIEW_AFISHA) routeNavigator.push("/afisha");
    if (story === VIEW_TARIFFS) routeNavigator.push("/tariffs");
    if (story === VIEW_PROFILE) routeNavigator.push("/profile");
  };

  const navigateToVoteByPromo = () => {
    if (promoCheckResult?.status === "active") {
      setActiveModal(null);
      routeNavigator.push(`/vote/${promoInput.trim().toUpperCase()}`);
    }
  };

  const { data: voteExpertData } = useQuery({
    queryKey: ["expertProfile", targetExpertId],
    queryFn: () => {
      if (!targetExpertId) return null;
      return apiGet<UserData>(`/experts/${targetExpertId}`);
    },
    enabled: !!targetExpertId && activeModal === "narod-vote-modal",
  });

  const submitCommunityVote = async (voteData: any) => {
    if (!voteExpertData) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiPost(`/experts/${voteExpertData.vk_id}/vote`, {
        voter_vk_id: currentUser?.vk_id,
        ...voteData,
      });

      setPopout(null);
      setActiveModal(null);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Ваш голос учтен!
        </Snackbar>,
      );
      await queryClient.invalidateQueries({
        queryKey: ["expertProfile", String(voteExpertData.vk_id)],
      });
    } catch (err) {
      setPopout(null);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
    }
  };

  const cancelCommunityVote = async () => {
    if (!voteExpertData) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiDelete(`/experts/${voteExpertData.vk_id}/vote`);

      setPopout(null);
      setActiveModal(null);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Ваш голос отменен.
        </Snackbar>,
      );
      await queryClient.invalidateQueries({
        queryKey: ["expertProfile", String(voteExpertData.vk_id)],
      });
    } catch (err) {
      setPopout(null);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          {(err as Error).message}
        </Snackbar>,
      );
    }
  };

  const userTariff = currentUser?.tariff_plan || "Начальный";
  const mailingLimit = TARIFF_MAILING_LIMITS[userTariff] || 1;

  if (isAppInitializing) return <ScreenSpinner state="loading" />;

  if (showLegalConsent) {
    return (
      <AppRoot>
        <SplitLayout>
          <SplitCol>
            <View activePanel="legal_consent_panel">
              <Panel id="legal_consent_panel">
                <LegalConsent
                  onAccept={acceptLegalTerms}
                  onOpenDoc={openLegalDocument}
                />
              </Panel>
            </View>
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    );
  }

  if (showOnboarding) return <Onboarding onFinish={completeOnboarding} />;

  return (
    <AppRoot>
      <SplitLayout>
        <SplitCol>
          <Epic
            activeStory={activeView}
            tabbar={
              <Tabbar>
                <TabbarItem
                  onClick={navigateToView}
                  selected={activeView === VIEW_MAIN}
                  data-story={VIEW_MAIN}
                  label="Рейтинг"
                >
                  <Icon28ArticleOutline />
                </TabbarItem>
                <TabbarItem
                  onClick={navigateToView}
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
                  }}
                  label={
                    <div
                      style={{
                        whiteSpace: "normal",
                        lineHeight: 1.2,
                        fontSize: "10px",
                      }}
                    >
                      Голосовать
                    </div>
                  }
                >
                  <Icon24CheckCircleFilledBlue />
                </TabbarItem>
                {!isMobilePlatform && (
                  <TabbarItem
                    onClick={navigateToView}
                    selected={activeView === VIEW_TARIFFS}
                    data-story={VIEW_TARIFFS}
                    label="Тарифы"
                  >
                    <Icon28MoneyCircleOutline />
                  </TabbarItem>
                )}
                <TabbarItem
                  onClick={navigateToView}
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
            }
          >
            <View id={VIEW_MAIN} activePanel={activePanel}>
              <Home id={PANEL_HOME} />
              <Registration
                id={PANEL_REGISTRATION}
                selectedThemeIds={activeThemeIds}
                onOpenTopicsModal={() => setActiveModal("topics-modal")}
                allThemes={themeCategories}
                allRegions={regionList}
                openSelectModal={configureSelectModal}
              />
              <Voting id={PANEL_VOTING} />
              <ExpertProfile
                id={PANEL_EXPERT_PROFILE}
                onReportPurchase={requestReportPurchase}
              />
              <Admin id={PANEL_ADMIN} />
            </View>
            <View id={VIEW_AFISHA} activePanel={activePanel}>
              <Afisha
                id={PANEL_AFISHA}
                onEventClick={openEventActionModal}
                openSelectModal={configureSelectModal}
              />
            </View>
            <View id={VIEW_TARIFFS} activePanel={activePanel}>
              <Tariffs id={PANEL_TARIFFS} />
            </View>
            <View id={VIEW_PROFILE} activePanel={activePanel}>
              <Profile
                id={PANEL_PROFILE}
                onOpenCreateEventModal={() =>
                  setActiveModal("create-event-modal")
                }
                onEventClick={openEventActionModal}
              />
            </View>
          </Epic>
        </SplitCol>
      </SplitLayout>
      {snackbar}
      {popout && <PopoutWrapper>{popout}</PopoutWrapper>}
      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalCard
          id="promo-vote-modal"
          onClose={() => setActiveModal(null)}
          title="Голосование"
        >
          <FormItem
            top={<Text>Введите промо-слово или наведите камеру на QR-код</Text>}
            bottom={getPromoStatusMessage()}
            status={isPromoErrorState ? "error" : "default"}
          >
            <FormField
              status={isPromoErrorState ? "error" : "default"}
            >
              <Input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                maxLength={20}
                style={isMobilePlatform ? { paddingRight: "40px" } : {}}
              />
            </FormField>
            {isPromoLengthError && (
               <Text style={{ fontSize: 12, color: "var(--vkui--color_text_negative)", marginTop: 4 }}>
                 Код должен содержать от 4 до 20 символов
               </Text>
            )}
          </FormItem>
          <FormItem>
            <Button
              size="l"
              stretched
              onClick={navigateToVoteByPromo}
              disabled={
                promoCheckResult?.status !== "active" || isPromoLengthError
              }
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
                  value={topicSearchQuery}
                  onChange={(e) => setTopicSearchQuery(e.target.value)}
                  placeholder="Поиск по темам"
                  style={isMobile ? { paddingRight: "82px" } : {}}
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
            {filteredTopicGroups.map((group) => (
              <div key={group.name}>
                <Header>{group.name}</Header>
                {group.items.map((item: any) => (
                  <Checkbox
                    key={item.id}
                    checked={activeThemeIds.includes(item.id)}
                    onChange={(e) => toggleTopicSelection(e, item.id)}
                    disabled={
                      activeThemeIds.length >= 3 &&
                      !activeThemeIds.includes(item.id)
                    }
                  >
                    {item.name}
                  </Checkbox>
                ))}
              </div>
            ))}
            {filteredTopicGroups.length === 0 && <Div>Ничего не найдено</Div>}
          </Group>
        </ModalPage>

        <CreateEvent
          id="create-event-modal"
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["myEvents", currentUser?.vk_id],
            });
          }}
        />

        <EventActionModal
          id="event-actions-modal"
          event={interactionEvent}
          onClose={() => setActiveModal(null)}
          onShare={handleShareEvent}
          onDelete={confirmDeleteEvent}
          onStop={confirmStopEvent}
          onShowQr={() => setActiveModal("qr-code-modal")}
        />
        <QrCodeModal
          id="qr-code-modal"
          event={interactionEvent}
          onClose={() => setActiveModal(null)}
        />
        <CreateMailingModal
          id="create-mailing-modal"
          onClose={() => setActiveModal(null)}
          onSend={async (message: string) => {
            setPopout(<Spinner size="l" />);
            try {
              await apiPost("/mailings/create", { message });
              setActiveModal(null);
              setSnackbar(
                <Snackbar
                  onClose={() => setSnackbar(null)}
                  before={<Icon16Done />}
                >
                  Рассылка отправлена на модерацию!
                </Snackbar>,
              );
              setDailyMailingsSent((prev) => prev + 1);
            } catch (err: any) {
              setSnackbar(
                <Snackbar
                  onClose={() => setSnackbar(null)}
                  before={<Icon16Cancel />}
                >
                  {err.message || "Ошибка при отправке"}
                </Snackbar>,
              );
            } finally {
              setPopout(null);
            }
          }}
          mailingLimits={{ used: dailyMailingsSent, limit: mailingLimit }}
        />

        <ModalPage
          id="profile-settings-modal"
          onClose={() => setActiveModal(null)}
          header={
            <ModalPageHeader
              before={<PanelHeaderBack onClick={() => setActiveModal(null)} />}
            >
              Настройки
            </ModalPageHeader>
          }
          settlingHeight={100}
        >
          {currentUser?.is_expert && (
            <Group header={<Header>Настройки профиля</Header>}>
              <SimpleCell
                before={<Icon28EditOutline />}
                onClick={() => setActiveModal("edit-profile-modal")}
              >
                Редактировать профиль
              </SimpleCell>
              <SimpleCell
                Component="label"
                after={
                  <Switch
                    checked={currentUser?.show_community_rating ?? true}
                    onChange={(e) =>
                      updateUserSettings(
                        "show_community_rating",
                        e.target.checked,
                      )
                    }
                  />
                }
              >
                Показывать народный рейтинг
              </SimpleCell>
            </Group>
          )}

          {ENABLE_MAILINGS && currentUser?.is_expert && (
            <Group header={<Header>Инструменты эксперта</Header>}>
              <SimpleCell
                onClick={() => {
                  setActiveModal(null);
                  setTimeout(() => setActiveModal("create-mailing-modal"), 200);
                }}
              >
                Создать рассылку
              </SimpleCell>
            </Group>
          )}

          <Group header={<Header>Уведомления</Header>}>
            <SimpleCell
              Component="label"
              after={
                <Switch
                  name="allow_notifications"
                  checked={currentUser?.allow_notifications ?? false}
                  onChange={(e) =>
                    toggleNotificationSettings(
                      "allow_notifications",
                      e.target.checked,
                    )
                  }
                />
              }
            >
              Получать уведомления
            </SimpleCell>
            {ENABLE_MAILINGS && (
              <SimpleCell
                Component="label"
                disabled={!currentUser?.allow_notifications}
                after={
                  <Switch
                    name="allow_expert_mailings"
                    checked={currentUser?.allow_expert_mailings ?? false}
                    onChange={(e) =>
                      toggleNotificationSettings(
                        "allow_expert_mailings",
                        e.target.checked,
                      )
                    }
                    disabled={!currentUser?.allow_notifications}
                  />
                }
              >
                Сообщения от экспертов
              </SimpleCell>
            )}
          </Group>
          <Group header={<Header>О приложении</Header>}>
            <SimpleCell onClick={() => openLegalDocument("user_agreement")}>
              Пользовательское соглашение
            </SimpleCell>
            <SimpleCell onClick={() => openLegalDocument("privacy")}>
              Политика конфиденциальности
            </SimpleCell>
            <SimpleCell onClick={() => openLegalDocument("offer")}>
              Публичная оферта
            </SimpleCell>
            <SimpleCell onClick={() => openLegalDocument("mailing_consent")}>
              Согласие на рассылку
            </SimpleCell>
          </Group>
        </ModalPage>

        <FiltersModal
          id="home-filters"
          onClose={() => setActiveModal(null)}
          filterType="home"
          regions={regionList}
          categories={themeCategories}
          openSelectModal={configureSelectModal}
        />
        <FiltersModal
          id="afisha-filters"
          onClose={() => setActiveModal(null)}
          filterType="afisha"
          regions={regionList}
          categories={themeCategories}
          openSelectModal={configureSelectModal}
        />

        <SelectModal
          id="select-modal"
          onClose={() =>
            setActiveModal(selectModalState?.fallbackModal || null)
          }
          title={selectModalState?.title || ""}
          options={selectModalState?.options || []}
          selected={selectModalState?.selected || null}
          onSelect={selectModalState?.onSelect || (() => {})}
          searchable={selectModalState?.searchable || false}
        />

        <ModalCard
          id="registration-success"
          onClose={() => {
            setActiveModal(null);
            routeNavigator.back();
          }}
          icon={
            <Icon56CheckCircleOutline
              style={{ color: "var(--vkui--color_icon_positive)" }}
            />
          }
          title="Заявка отправлена на модерацию"
          description="Если вы ошиблись в данных, вы можете отозвать заявку в разделе 'Аккаунт' и подать ее заново."
          actions={
            <Button
              size="l"
              mode="primary"
              stretched
              onClick={() => {
                setActiveModal(null);
                routeNavigator.back();
              }}
            >
              Понятно
            </Button>
          }
        />

        <ModalPage
          id="narod-vote-modal"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>Народное голосование</ModalPageHeader>}
          settlingHeight={100}
        >
          <VoteCard
            onSubmit={submitCommunityVote}
            onCancelVote={cancelCommunityVote}
            initialVote={currentUser?.current_user_vote_info || null}
            setPopout={setPopout}
          />
        </ModalPage>

        <AfishaEventModal
          id="afisha-event-details"
          event={interactionEvent}
          onClose={() => setActiveModal(null)}
        />
        <PurchaseModal
          id="report-purchase-modal"
          onClose={() => setActiveModal(null)}
          title="Отчет по голосованию"
          description="Вы получите PDF-документ со всеми анонимными отзывами и комментариями по данному эксперту."
          price={500}
          onInitiatePayment={processReportPayment}
        />
        <MobilePaymentStubModal
          id="mobile-payment-stub"
          onClose={() => setActiveModal(null)}
        />

        <EditProfileModal
          id="edit-profile-modal"
          onClose={() => setActiveModal(null)}
          onBack={() => setActiveModal("profile-settings-modal")}
          currentUser={currentUser as UserData}
          onSave={submitProfileUpdate}
          openSelectModal={configureSelectModal}
          allRegions={regionList}
        />
      </ModalRoot>
    </AppRoot>
  );
};
