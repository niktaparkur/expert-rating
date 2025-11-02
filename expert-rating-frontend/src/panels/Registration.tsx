// src/panels/Registration.tsx

import React, { useState, useEffect, ReactNode } from "react";
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Button,
  FormItem,
  FormField,
  Input,
  Textarea,
  Select,
  ScreenSpinner,
  Group,
  Checkbox,
  Div,
  ContentBadge,
  ModalCard,
  Snackbar,
} from "@vkontakte/vkui";
import { Icon16Cancel, Icon56CheckCircleOutline } from "@vkontakte/icons";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "../hooks/useApi";
import { useUserStore } from "../store/userStore";
import { useUiStore } from "../store/uiStore";
import { UserData } from "../types";

// Определяем типы для данных, получаемых от API
interface ThemeItem {
  id: number;
  name: string;
}

interface ThemeCategory {
  id: number;
  name: string;
  items: ThemeItem[];
}

// Определяем тип для данных формы
interface FormData {
  region: string;
  social_link: string;
  regalia: string;
  performance_link: string;
  referrer: string;
}

// Определяем интерфейс для пропсов компонента
interface RegistrationProps {
  id: string;
  selectedThemeIds: number[];
  allThemes: ThemeCategory[];
  onOpenTopicsModal: () => void;
  allRegions: string[];
}

export const Registration = ({
  id,
  selectedThemeIds,
  allThemes,
  onOpenTopicsModal,
  allRegions,
}: RegistrationProps) => {
  const routeNavigator = useRouteNavigator();
  const { apiPost, apiGet } = useApi();
  const queryClient = useQueryClient();

  const { currentUser: user } = useUserStore();
  const { setPopout, setSnackbar } = useUiStore();

  const [formData, setFormData] = useState<FormData>({
    region: "",
    social_link: "",
    regalia: "",
    performance_link: "",
    referrer: "",
  });
  const [useVkProfile, setUseVkProfile] = useState<boolean>(true);

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
  };

  const isTopicSelectionValid =
    selectedThemeIds.length >= 1 && selectedThemeIds.length <= 3;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

      setPopout(
        <ModalCard
          id="success-modal"
          onClose={() => {
            setPopout(null);
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
                setPopout(null);
                routeNavigator.back();
              }}
            >
              Понятно
            </Button>
          }
        />,
      );
    } catch (error: any) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>{error.message}</Snackbar>,
      );
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

  // if (isLoadingMeta) {
  //   return (
  //     <Panel id={id}>
  //       <PanelHeader before={<PanelHeaderBack />} />
  //       <ScreenSpinner />
  //     </Panel>
  //   );
  // }

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
            <FormField>
              <Select
                name="region"
                value={formData.region}
                onChange={handleChange}
                options={allRegions.map((region) => ({
                  label: region,
                  value: region,
                }))}
                required
                searchable
                placeholder="Не выбран"
              />
            </FormField>
          </FormItem>
          <FormItem top="Ссылка на аккаунт или ваше сообщество">
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
            bottom="Эта ссылка будет видна только администраторам и организаторам"
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
