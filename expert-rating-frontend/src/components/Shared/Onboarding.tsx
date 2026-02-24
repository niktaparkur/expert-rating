import React, { useState } from "react";
import {
  Gallery,
  Div,
  Title,
  Text,
  Button,
  Separator,
  Headline,
} from "@vkontakte/vkui";
import { Icon16Done } from "@vkontakte/icons";
import bridge from "@vkontakte/vk-bridge";
import "../css/Onboarding.css";

interface OnboardingProps {
  onFinish: () => void;
}

const IconProfileCheck = () => (
  <div className="onboarding-icon" style={{ backgroundColor: "#4CAF50" }}>
    ✓
  </div>
);
const IconCalendarPlus = () => (
  <div className="onboarding-icon" style={{ backgroundColor: "#2196F3" }}>
    +
  </div>
);
const IconChartUp = () => (
  <div className="onboarding-icon" style={{ backgroundColor: "#FF9800" }}>
    ↑
  </div>
);
const IconNotifications = () => (
  <div className="onboarding-icon" style={{ backgroundColor: "#3F8AE0" }}>
    🔔
  </div>
);

export const Onboarding = ({ onFinish }: OnboardingProps) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  const groupId = Number(import.meta.env.VITE_VK_GROUP_ID);

  const handleAllowNotifications = async () => {
    if (!groupId) return;

    try {
      const result = await bridge.send("VKWebAppAllowMessagesFromGroup", {
        group_id: Math.abs(groupId),
      });

      if (result.result) {
        setIsPermissionGranted(true);
      }
    } catch (error: any) {
      const errorCode = error?.error_data?.error_code;

      if (errorCode === 11) {
        console.warn("[Onboarding] App is not moderated yet, code 11");
        alert(
          "Функция уведомлений будет активирована сразу после выхода приложения из режима разработки.",
        );
        setIsPermissionGranted(true);
      } else {
        console.error("[Onboarding] Notification error:", error);
      }
    }
  };

  return (
    <div className="onboarding-container">
      <Gallery
        slideWidth="100%"
        align="center"
        onChange={setSlideIndex}
        slideIndex={slideIndex}
        style={{ height: "100%" }}
      >
        <div className="onboarding-slide">
          <IconProfileCheck />
          <Title level="1">Стань экспертом</Title>
          <Headline
            weight="1"
            level="1"
            style={{ color: "var(--vkui--color_text_secondary)" }}
            useAccentWeight
          >
            Твоя экспертность — ценность
          </Headline>
          <Text>
            Пройди быструю регистрацию в мини-приложении VK и попади в
            национальную базу проверенных специалистов.
          </Text>
        </div>

        <div className="onboarding-slide">
          <IconCalendarPlus />
          <Title level="1">Делись знаниями</Title>
          <Headline
            weight="1"
            level="1"
            style={{ color: "var(--vkui--color_text_secondary)" }}
            useAccentWeight
          >
            Создавай свои мероприятия
          </Headline>
          <Text>
            Проводи вебинары, мастер-классы или запиши видеоурок — и монетизируй
            свои знания.
          </Text>
        </div>

        <div className="onboarding-slide">
          <IconChartUp />
          <Title level="1">Зарабатывай репутацию</Title>
          <Headline
            weight="1"
            level="1"
            style={{ color: "var(--vkui--color_text_secondary)" }}
            useAccentWeight
          >
            Расти в рейтинге. Получай доверие.
          </Headline>
          <Text>
            Участвуй в голосовании, получай честные отзывы и повышай свой
            статус. Стань экспертом для таких событий, как Росконгресс.
          </Text>
        </div>

        <div className="onboarding-slide">
          <IconNotifications />
          <Title level="1">Будь в курсе</Title>
          <Headline
            weight="1"
            level="1"
            style={{ color: "var(--vkui--color_text_secondary)" }}
            useAccentWeight
          >
            Получай важные уведомления
          </Headline>
          <Text>
            Разрешите отправку сообщений, чтобы мы могли уведомлять вас о
            статусе ваших заявок, новых голосах и других событиях в приложении.
          </Text>

          {isPermissionGranted ? (
            <Button
              size="l"
              style={{ marginTop: 20 }}
              disabled
              before={<Icon16Done />}
            >
              Разрешение получено
            </Button>
          ) : (
            <Button
              size="l"
              mode="secondary"
              style={{ marginTop: 20 }}
              onClick={handleAllowNotifications}
              disabled={!groupId}
            >
              Разрешить уведомления
            </Button>
          )}
        </div>
      </Gallery>
      <Separator />
      <Div>
        {slideIndex < 3 ? (
          <Button
            size="l"
            stretched
            mode="primary"
            onClick={() => setSlideIndex(slideIndex + 1)}
          >
            Далее
          </Button>
        ) : (
          <Button size="l" stretched onClick={onFinish}>
            Начать
          </Button>
        )}
      </Div>
    </div>
  );
};
