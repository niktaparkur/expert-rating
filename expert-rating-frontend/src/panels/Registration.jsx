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
import { useApi } from "../hooks/useApi";

export const Registration = ({
  id,
  user,
  refetchUser,
  selectedThemeIds,
  onOpenTopicsModal,
}) => {
  const routeNavigator = useRouteNavigator();
  const { apiPost, apiGet } = useApi();
  const [popout, setPopout] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  const [allThemes, setAllThemes] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  const [formData, setFormData] = useState({
    region: "",
    social_link: "",
    regalia: "",
    performance_link: "",
    referrer: "",
  });

  const [useVkProfile, setUseVkProfile] = useState(true);

  useEffect(() => {
    const fetchMetaData = async () => {
      setIsLoadingMeta(true);
      try {
        const [themesData, regionsData] = await Promise.all([
          apiGet("/meta/themes"),
          apiGet("/meta/regions"),
        ]);

        setAllThemes(themesData);
        setAllRegions(regionsData);

        if (regionsData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            region: prev.region || regionsData[0],
          }));
        }
      } catch (error) {
        console.error("Failed to fetch initial data for registration", error);
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)} before={<Icon16Cancel />}>
            Не удалось загрузить данные для регистрации.
          </Snackbar>,
        );
      } finally {
        setIsLoadingMeta(false);
      }
    };

    fetchMetaData();
  }, [apiGet]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isTopicSelectionValid =
    selectedThemeIds.length >= 1 && selectedThemeIds.length <= 3;

  const handleSubmit = async (e) => {
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
        referrer: formData.referrer,
      },
    };

    try {
      await apiPost("/experts/register", finalData);
      await refetchUser();
      setPopout(
        <ModalCard
          id="success-modal"
          onClose={() => setPopout(null)}
          icon={
            <Icon56CheckCircleOutline
              style={{ color: "var(--vkui--color_icon_positive)" }}
            />
          }
          header="Заявка отправлена на модерацию"
          subheader="Если вы ошиблись в данных, вы можете отозвать заявку в разделе 'Аккаунт' и подать ее заново."
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
    } catch (error) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>{error.message}</Snackbar>,
      );
      setPopout(null);
    }
  };

  const getSelectedThemeNames = () => {
    const names = [];
    for (const category of allThemes) {
      for (const theme of category.items) {
        if (selectedThemeIds.includes(theme.id)) {
          names.push(theme.name);
        }
      }
    }
    return names;
  };

  if (isLoadingMeta) {
    return (
      <Panel id={id}>
        <ScreenSpinner />
      </Panel>
    );
  }

  return (
    <Panel id={id} popout={popout}>
      <PanelHeader
        before={
          <PanelHeaderBack
            onClick={() => popout === null && routeNavigator.back()}
          />
        }
      >
        Стать экспертом
      </PanelHeader>
      <Group>
        <form onSubmit={handleSubmit}>
          <FormItem
            top="Темы экспертизы"
            bottom={`Выбрано: ${selectedThemeIds.length} из 3`}
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
          <FormItem top="Регалии">
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
          <FormItem top="Ссылка на пример выступления (показывается только для организаторов мероприятий)">
            <FormField>
              <Input
                type="url"
                name="performance_link"
                value={formData.performance_link}
                onChange={handleChange}
                placeholder="https://vk.com/..."
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
                placeholder="Логин или ID пригласившего"
              />
            </FormField>
          </FormItem>
          <FormItem>
            <Button
              size="l"
              stretched
              type="submit"
              disabled={popout !== null || !isTopicSelectionValid}
            >
              Отправить на модерацию
            </Button>
          </FormItem>
        </form>
      </Group>
      {snackbar}
    </Panel>
  );
};
