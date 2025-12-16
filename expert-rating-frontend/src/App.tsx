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
import "./styles/global.css";
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
import { VoteCard } from "./components/Vote/VoteCard";

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

const GROUP_ID = Number(import.meta.env.VITE_VK_GROUP_ID);
const TARIFF_MAILING_LIMITS: { [key: string]: number } = {
  Начальный: 1,
  Стандарт: 2,
  Профи: 4,
};

const ENABLE_MAILINGS = false;

export const App = () => {
  const platform = usePlatform();
  const { view: activeView = VIEW_MAIN, panel: activePanel = PANEL_HOME } =
    useActiveVkuiLocation();
  const routeNavigator = useRouteNavigator();
  const { apiGet, apiPost, apiPut, apiDelete } = useApi();
  const [searchParams] = useSearchParams();
  const hasLaunchParams = searchParams.toString().length > 0;
  const queryClient = useQueryClient();

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

  const [promoWord, setPromoWord] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLegalConsent, setShowLegalConsent] = useState(false);
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [promoStatus, setPromoStatus] = useState<any | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allThemes, setAllThemes] = useState<any[]>([]);
  const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [mailingsUsed, setMailingsUsed] = useState(0);
  const [expertIdForReport, setExpertIdForReport] = useState<number | null>(
    null,
  );

  const [selectModalConfig, setSelectModalConfig] = useState<{
    title: string;
    options: Option[];
    selected: string | number | null;
    onSelect: (value: string | number) => void;
    searchable?: boolean;
    fallbackModal?: string | null;
  } | null>(null);

  const isMobilePlatform = platform === "ios" || platform === "android";

  const handleOpenEventModal = (event: EventData) => {
    setSelectedEvent(event);
    if (activeView === VIEW_AFISHA) {
      setActiveModal("afisha-event-details");
    } else {
      setActiveModal("event-actions-modal");
    }
  };

  const handleOpenReportPurchase = (expertId: number) => {
    setExpertIdForReport(expertId);
    if (isMobilePlatform) {
      setActiveModal("mobile-payment-stub");
    } else {
      if (currentUser && !currentUser.allow_notifications) {
        bridge
          .send("VKWebAppAllowMessagesFromGroup", {
            group_id: GROUP_ID,
          })
          .then((data) => {
            if (data.result) {
              apiPut("/users/me/settings", { allow_notifications: true }).then(
                () =>
                  queryClient.invalidateQueries({ queryKey: ["user", "me"] }),
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
    }
  };

  const handleInitiateReportPayment = async ({ email }: { email: string }) => {
    if (!expertIdForReport) return;
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
        `/payment/reports/${expertIdForReport}/create-payment`,
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

  const handleSaveProfile = async (profileData: any) => {
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

  const openSelectModal = (
    title: string,
    options: Option[],
    selected: string | number | null,
    onSelect: (val: any) => void,
    searchable = false,
    fallbackModal: string | null = null,
  ) => {
    setSelectModalConfig({
      title,
      options,
      selected,
      onSelect,
      searchable,
      fallbackModal,
    });
    setActiveModal("select-modal");
  };

  const { data: allRegions = [] } = useQuery({
    queryKey: ["metaRegions"],
    queryFn: () => apiGet<string[]>("/meta/regions"),
  });

  useEffect(() => {
    apiGet<any[]>("/meta/themes")
      .then(setAllThemes)
      .catch((e) => console.error("Failed to load themes", e));
  }, [apiGet]);

  const handleShare = () => {
    if (!selectedEvent) return;
    const link = `https://vk.com/app${import.meta.env.VITE_VK_APP_ID}#/vote/${selectedEvent.promo_word}`;

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

  const performDeleteEvent = async () => {
    if (!selectedEvent) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiDelete(`/events/${selectedEvent.id}`);
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

  const handleDeleteEvent = () => {
    setActiveModal(null);
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Удалить",
            mode: "destructive",
            action: performDeleteEvent,
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение"
        description="Вы уверены, что хотите удалить это мероприятие? Действие необратимо."
      />,
    );
  };

  const performStopEvent = async () => {
    if (!selectedEvent) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiPost(`/events/${selectedEvent.id}/stop`, {});
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

  const handleStopEvent = () => {
    setActiveModal(null);
    setPopout(
      <Alert
        actions={[
          { title: "Отмена", mode: "cancel" },
          {
            title: "Остановить",
            mode: "destructive",
            action: performStopEvent,
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение"
        description="Вы уверены, что хотите остановить прием голосов? После этого запустить его снова будет невозможно."
      />,
    );
  };

  const handleShowQr = () => setActiveModal("qr-code-modal");

  const handleSettingsChange = async (fieldName: string, value: boolean) => {
    if (!currentUser) return;
    setPopout(<Spinner size="xl" />);
    const payload = { [fieldName]: value };
    if (fieldName === "allow_notifications" && !value) {
      payload.allow_expert_mailings = false;
    }
    try {
      const updatedUser = await apiPut<UserData>("/users/me/settings", payload);
      setCurrentUser(updatedUser);
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

  const handleNotificationSettingsChange = async (
    fieldName: "allow_notifications" | "allow_expert_mailings",
    value: boolean,
  ) => {
    if (fieldName === "allow_expert_mailings") {
      await handleSettingsChange(fieldName, value);
      return;
    }

    if (value === true) {
      if (bridge.isWebView()) {
        try {
          const result = await bridge.send("VKWebAppAllowMessagesFromGroup", {
            group_id: GROUP_ID,
          });
          if (result.result) {
            await handleSettingsChange(fieldName, true);
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
        await handleSettingsChange(fieldName, value);
      }
    } else {
      await handleSettingsChange(fieldName, false);
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

  const handleTopicChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    themeId: number,
  ) => {
    const { checked } = e.target;
    if (checked) {
      if (selectedThemeIds.length < 3) {
        setSelectedThemeIds([...selectedThemeIds, themeId]);
      }
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
        items: group.items.filter((item: any) =>
          item.name.toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery, allThemes]);

  const checkPromo = useCallback(
    debounce(async (word: string) => {
      const normalizedWord = word.trim().toUpperCase();
      if (!normalizedWord || !/^[A-Z0-9А-ЯЁ]{4,}$/i.test(normalizedWord)) {
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

  const handlePromoWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleLegalAccept = async () => {
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

  const handleOpenLegalDoc = (
    docType: "offer" | "user_agreement" | "privacy" | "mailing_consent",
  ) => {
    const url = LEGAL_DOCUMENTS[docType].url;

    if (url) {
      if (platform === "vkcom") {
        // На ПК открываем в новой вкладке стандартным способом
        window.open(url, "_blank");
      } else {
        // На мобильных пытаемся открыть через нативный браузер
        bridge.send("VKWebAppOpenUrl" as any, { url }).catch((error) => {
          console.warn("VKWebAppOpenUrl failed, using fallback:", error);
          // Если бридж не сработал (например, в мобильном браузере), тоже открываем через window.open
          window.open(url, "_blank");
        });
      }
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
        console.warn(
          "VK Storage check failed (legal), falling back to localStorage",
          e,
        );
        if (localStorage.getItem("legalAccepted_v1")) legalNeeded = false;
      }

      if (legalNeeded) {
        setShowLegalConsent(true);
        setIsLoadingApp(false);
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
          console.warn(
            "VK Storage check failed (onboarding), falling back to localStorage",
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
        setIsLoadingApp(false);
      }
    };
    initApp();
  }, [apiGet, apiPost, hasLaunchParams, setCurrentUser, showLegalConsent]);

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
    setIsLoadingApp(true);
    window.location.reload();
  };

  const onStoryChange = (e: React.MouseEvent<HTMLElement>) => {
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

  const { data: expertForVote } = useQuery({
    queryKey: ["expertProfile", targetExpertId],
    queryFn: () => {
      if (!targetExpertId) return null;
      return apiGet<UserData>(`/experts/${targetExpertId}`);
    },
    enabled: !!targetExpertId && activeModal === "narod-vote-modal",
  });

  const handleCommunityVoteSubmit = async (voteData: any) => {
    if (!expertForVote) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiPost(`/experts/${expertForVote.vk_id}/vote`, {
        voter_vk_id: currentUser?.vk_id,
        ...voteData,
      });
      setActiveModal(null);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Ваш голос учтен!
        </Snackbar>,
      );
      await queryClient.invalidateQueries({
        queryKey: ["expertProfile", String(expertForVote.vk_id)],
      });
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

  const performCancelCommunityVote = async () => {
    if (!expertForVote) return;
    setPopout(<Spinner size="xl" />);
    try {
      await apiDelete(`/experts/${expertForVote.vk_id}/vote`);
      setActiveModal(null);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Done />}>
          Ваш голос отменен.
        </Snackbar>,
      );
      await queryClient.invalidateQueries({
        queryKey: ["expertProfile", String(expertForVote.vk_id)],
      });
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

  const userTariff = currentUser?.tariff_plan || "Начальный";
  const mailingLimit = TARIFF_MAILING_LIMITS[userTariff] || 1;

  const renderTabbar = () => (
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
        }}
        label={
          <div
            style={{ whiteSpace: "normal", lineHeight: 1.2, fontSize: "10px" }}
          >
            Голосовать
          </div>
        }
      >
        <Icon24CheckCircleFilledBlue />
      </TabbarItem>
      {!isMobilePlatform && (
        <TabbarItem
          onClick={onStoryChange}
          selected={activeView === VIEW_TARIFFS}
          data-story={VIEW_TARIFFS}
          label="Тарифы"
        >
          <Icon28MoneyCircleOutline />
        </TabbarItem>
      )}
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

  if (isLoadingApp) return <ScreenSpinner state="loading" />;

  // --- LEGAL CONSENT SCREEN ---
  if (showLegalConsent) {
    return (
      <AppRoot>
        <SplitLayout>
          <SplitCol>
            <View activePanel="legal_consent_panel">
              <Panel id="legal_consent_panel">
                <LegalConsent
                  onAccept={handleLegalAccept}
                  onOpenDoc={handleOpenLegalDoc}
                />
              </Panel>
            </View>
          </SplitCol>
        </SplitLayout>
      </AppRoot>
    );
  }

  if (showOnboarding) return <Onboarding onFinish={finishOnboarding} />;

  return (
    <AppRoot>
      <SplitLayout>
        <SplitCol>
          <Epic activeStory={activeView} tabbar={renderTabbar()}>
            {/* Views content - NO CHANGE */}
            <View id={VIEW_MAIN} activePanel={activePanel}>
              <Home id={PANEL_HOME} />
              <Registration
                id={PANEL_REGISTRATION}
                selectedThemeIds={selectedThemeIds}
                onOpenTopicsModal={() => setActiveModal("topics-modal")}
                allThemes={allThemes}
                allRegions={allRegions}
                openSelectModal={openSelectModal}
              />
              <Voting id={PANEL_VOTING} />
              <ExpertProfile
                id={PANEL_EXPERT_PROFILE}
                onReportPurchase={handleOpenReportPurchase}
              />
              <Admin id={PANEL_ADMIN} />
            </View>
            <View id={VIEW_AFISHA} activePanel={activePanel}>
              <Afisha
                id={PANEL_AFISHA}
                onEventClick={handleOpenEventModal}
                openSelectModal={openSelectModal}
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
                onEventClick={handleOpenEventModal}
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
                {group.items.map((item: any) => (
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
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["myEvents", currentUser?.vk_id],
            });
          }}
        />

        <EventActionModal
          id="event-actions-modal"
          event={selectedEvent}
          onClose={() => setActiveModal(null)}
          onShare={handleShare}
          onDelete={handleDeleteEvent}
          onStop={handleStopEvent}
          onShowQr={handleShowQr}
        />
        <QrCodeModal
          id="qr-code-modal"
          event={selectedEvent}
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
              setMailingsUsed((prev) => prev + 1);
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
          mailingLimits={{ used: mailingsUsed, limit: mailingLimit }}
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
                      handleSettingsChange(
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
                    handleNotificationSettingsChange(
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
                      handleNotificationSettingsChange(
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
            <SimpleCell onClick={() => handleOpenLegalDoc("user_agreement")}>
              Пользовательское соглашение
            </SimpleCell>
            <SimpleCell onClick={() => handleOpenLegalDoc("privacy")}>
              Политика конфиденциальности
            </SimpleCell>
            <SimpleCell onClick={() => handleOpenLegalDoc("offer")}>
              Публичная оферта
            </SimpleCell>
            <SimpleCell onClick={() => handleOpenLegalDoc("mailing_consent")}>
              Согласие на рассылку
            </SimpleCell>
          </Group>
        </ModalPage>

        <FiltersModal
          id="home-filters"
          onClose={() => setActiveModal(null)}
          filterType="home"
          regions={allRegions}
          categories={allThemes}
          openSelectModal={openSelectModal}
        />
        <FiltersModal
          id="afisha-filters"
          onClose={() => setActiveModal(null)}
          filterType="afisha"
          regions={allRegions}
          categories={allThemes}
          openSelectModal={openSelectModal}
        />

        <SelectModal
          id="select-modal"
          onClose={() =>
            setActiveModal(selectModalConfig?.fallbackModal || null)
          }
          title={selectModalConfig?.title || ""}
          options={selectModalConfig?.options || []}
          selected={selectModalConfig?.selected || null}
          onSelect={selectModalConfig?.onSelect || (() => {})}
          searchable={selectModalConfig?.searchable || false}
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
            onSubmit={handleCommunityVoteSubmit}
            onCancelVote={performCancelCommunityVote}
            initialVote={currentUser?.current_user_vote_info || null}
            setPopout={setPopout}
          />
        </ModalPage>

        <AfishaEventModal
          id="afisha-event-details"
          event={selectedEvent}
          onClose={() => setActiveModal(null)}
        />
        <PurchaseModal
          id="report-purchase-modal"
          onClose={() => setActiveModal(null)}
          title="Отчет по голосованию"
          description="Вы получите PDF-документ со всеми анонимными отзывами и комментариями по данному эксперту."
          price={500}
          onInitiatePayment={handleInitiateReportPayment}
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
          onSave={handleSaveProfile}
          openSelectModal={openSelectModal}
          allRegions={allRegions}
        />
      </ModalRoot>
    </AppRoot>
  );
};
