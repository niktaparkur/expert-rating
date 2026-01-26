import React, { useState, useEffect } from "react";
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Button,
  FormItem,
  FormField,
  Input,
  Textarea,
  ScreenSpinner,
  Group,
  Checkbox,
  Div,
  ContentBadge,
  Snackbar,
  Cell,
} from "@vkontakte/vkui";
import { Icon16Cancel, Icon24ChevronRight } from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useQueryClient } from "@tanstack/react-query";

import { useApi } from "../hooks/useApi";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import { Option } from "../components/Shared/SelectModal";

interface ThemeItem {
  id: number;
  name: string;
}

interface ThemeCategory {
  id: number;
  name: string;
  items: ThemeItem[];
}

interface FormData {
  region: string;
  social_link: string;
  regalia: string;
  performance_link: string;
  referrer: string;
}

interface RegistrationProps {
  id: string;
  selectedThemeIds: number[];
  allThemes: ThemeCategory[];
  onOpenTopicsModal: () => void;
  allRegions: string[];
  openSelectModal: (
    title: string,
    options: Option[],
    selected: string | number | null,
    onSelect: (val: any) => void,
    searchable?: boolean,
    fallbackModal?: string | null,
  ) => void;
}

const validateUrl = (url: string, allowedHosts: string[]): boolean => {
  try {
    const parsedUrl = new URL(url);
    return allowedHosts.some((host) => parsedUrl.hostname.endsWith(host));
  } catch (error) {
    return false;
  }
};

export const Registration = ({
  id,
  selectedThemeIds,
  allThemes,
  onOpenTopicsModal,
  allRegions,
  openSelectModal,
}: RegistrationProps) => {
  const routeNavigator = useRouteNavigator();
  const queryClient = useQueryClient();



  const { apiPost, apiGet } = useApi();
  const { currentUser: user, setCurrentUser } = useUserStore();
  const { setPopout, setSnackbar, setActiveModal } = useUiStore();

  const [formData, setFormData] = useState<FormData>({
    region: "",
    social_link: "",
    regalia: "",
    performance_link: "",
    referrer: "",
  });
  const [useVkProfile, setUseVkProfile] = useState<boolean>(true);

  const [errors, setErrors] = useState({
    social_link: "",
    performance_link: "",
  });

  useEffect(() => {
    if (allRegions.length > 0 && !formData.region) {
      setFormData((prev) => ({ ...prev, region: allRegions[0] }));
    }
  }, [allRegions, formData.region]);

  useEffect(() => {
    if (useVkProfile && user?.vk_id) {
      setFormData((prev) => ({
        ...prev,
        social_link: `https://vk.com/id${user.vk_id}`,
      }));
    } else {
      setFormData((prev) => ({ ...prev, social_link: "" }));
    }
  }, [useVkProfile, user?.vk_id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "social_link") {
      const isValid = validateUrl(value, [
        "vk.com",
        "vk.ru",
        "ok.ru",
        "rutube.ru",
        "dzen.ru",
        "t.me",
      ]);
      setErrors((prev) => ({
        ...prev,
        social_link: isValid ? "" : "Недопустимая ссылка",
      }));
    }
    if (name === "performance_link") {
      const isValid = validateUrl(value, [
        "disk.yandex.ru",
        "vk.com",
        "vk.ru",
        "rutube.ru",
        "youtube.com",
        "vimeo.com",
        "dzen.ru",
      ]);
      setErrors((prev) => ({
        ...prev,
        performance_link: isValid ? "" : "Недопустимая ссылка",
      }));
    }
  };

  const handleRegionSelect = (val: string) => {
    setFormData((prev) => ({ ...prev, region: val }));
  };

  const isTopicSelectionValid =
    selectedThemeIds.length >= 1 && selectedThemeIds.length <= 3;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (errors.social_link || errors.performance_link) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Пожалуйста, исправьте ошибки в ссылках.
        </Snackbar>,
      );
      return;
    }

    if (!isTopicSelectionValid) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Пожалуйста, выберите от 1 до 3 тем.
        </Snackbar>,
      );
      return;
    }
    if (!user) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
          Не удалось получить данные профиля VK.
        </Snackbar>,
      );
      return;
    }

    setPopout(<ScreenSpinner state="loading" />);

    const finalData = {
      user_data: {
        vk_id: user.vk_id,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
      },
      profile_data: {
        ...formData,
        theme_ids: selectedThemeIds,
        referrer_info: formData.referrer,
      },
    };

    try {
      await apiPost("/experts/register", finalData);

      await queryClient.invalidateQueries({ queryKey: ["user", "me"] });

      const updatedUser = await apiGet<any>("/users/me");

      setCurrentUser(updatedUser);

      setActiveModal("registration-success");
    } catch (error: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>{error.message}</Snackbar>,
      );
    } finally {
      setPopout(null);
    }
  };

  const getSelectedThemeNames = (): string[] => {
    const names: string[] = [];
    if (!allThemes) return [];
    for (const category of allThemes) {
      for (const theme of category.items) {
        if (selectedThemeIds.includes(theme.id)) {
          names.push(theme.name);
        }
      }
    }
    return names;
  };

  const regionOptions = allRegions.map((region) => ({
    label: region,
    value: region,
  }));

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
      >
        Стать экспертом
      </PanelHeader>
      <Group>
        <form onSubmit={handleSubmit}>
          <FormItem
            top="Темы экспертизы"
            bottom={`Выбрано: ${selectedThemeIds.length} из 3`}
            status={!isTopicSelectionValid ? "error" : "default"}
          >
            <Button
              mode="secondary"
              size="l"
              stretched
              onClick={onOpenTopicsModal}
            >
              Выбрать темы
            </Button>
            {selectedThemeIds.length > 0 && (
              <Div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  paddingTop: 10,
                  paddingBottom: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
              >
                {getSelectedThemeNames().map((name) => (
                  <ContentBadge key={name} mode="primary">
                    {name}
                  </ContentBadge>
                ))}
              </Div>
            )}
          </FormItem>
          <FormItem top="Домашний регион">
            <Cell
              after={
                <Icon24ChevronRight
                  style={{ color: "var(--vkui--color_icon_secondary)" }}
                />
              }
              onClick={() =>
                openSelectModal(
                  "Выберите регион",
                  regionOptions,
                  formData.region,
                  handleRegionSelect,
                  true,
                )
              }
              style={{ padding: 0 }}
            >
              {formData.region || "Не выбран"}
            </Cell>
          </FormItem>
          <FormItem
            top="Ссылка на аккаунт или ваше сообщество"
            status={errors.social_link ? "error" : "default"}
            bottom={errors.social_link}
          >
            <FormField>
              <Input
                type="url"
                name="social_link"
                value={formData.social_link}
                onChange={handleChange}
                placeholder="https://vk.com/"
                required
                disabled={useVkProfile}
              />
            </FormField>
            <Checkbox
              checked={useVkProfile}
              onChange={(e) => setUseVkProfile(e.target.checked)}
            >
              Использовать мой профиль VK
            </Checkbox>
          </FormItem>
          <FormItem top="Регалии" bottom={`${formData.regalia.length} / 200`}>
            <FormField>
              <Textarea
                name="regalia"
                value={formData.regalia}
                onChange={handleChange}
                placeholder="Кратко опишите ваши достижения"
                maxLength={200}
                required
              />
            </FormField>
          </FormItem>
          <FormItem
            top="Ссылка на пример выступления"
            status={errors.performance_link ? "error" : "default"}
            bottom={
              errors.performance_link ||
              "Эта ссылка будет видна только администраторам и организаторам"
            }
          >
            <FormField>
              <Input
                type="url"
                name="performance_link"
                value={formData.performance_link}
                onChange={handleChange}
                placeholder="https://vk.com/video..."
                required
              />
            </FormField>
          </FormItem>
          <FormItem top="Кто вас пригласил? (необязательно)">
            <FormField>
              <Input
                type="text"
                name="referrer"
                value={formData.referrer}
                onChange={handleChange}
                placeholder="Промокод или ID пригласившего"
              />
            </FormField>
          </FormItem>
          <Div>
            <Button
              size="l"
              stretched
              type="submit"
              disabled={!isTopicSelectionValid}
            >
              Отправить на модерацию
            </Button>
          </Div>
        </form>
      </Group>
    </Panel>
  );
};
