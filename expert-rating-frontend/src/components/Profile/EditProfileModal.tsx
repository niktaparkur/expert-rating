import React, { useState, useEffect } from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  Group,
  FormItem,
  Textarea,
  Button,
  Div,
  Input,
  Cell,
  FormStatus,
  Spinner,
} from "@vkontakte/vkui";
import { Icon24ChevronRight } from "@vkontakte/icons";
import { UserData } from "../../types";
import { Option } from "../Shared/SelectModal";

interface EditProfileModalProps {
  id: string;
  onClose: () => void;
  onBack: () => void;
  currentUser: UserData;
  onSave: (data: any) => Promise<void>;
  openSelectModal: (
    title: string,
    options: Option[],
    selected: string | number | null,
    onSelect: (val: any) => void,
    searchable?: boolean,
    fallbackModal?: string | null,
  ) => void;
  allRegions: string[];
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  id,
  onClose,
  onBack,
  currentUser,
  onSave,
  openSelectModal,
  allRegions,
}) => {
  const [formData, setFormData] = useState({
    region: "",
    social_link: "",
    regalia: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        region: currentUser.region || "",
        social_link: currentUser.social_link || "",
        regalia: currentUser.regalia || "",
      });
    }
  }, [currentUser]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegionSelect = (val: string) => {
    setFormData((prev) => ({ ...prev, region: val }));
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const regionOptions = allRegions.map((r) => ({ label: r, value: r }));

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onBack} />}>
          Редактирование профиля
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Div>
        <FormStatus title="Премодерация" mode="default">
          Изменение данных профиля требует проверки администратором. После
          сохранения будет создана заявка.
        </FormStatus>
      </Div>
      <Group>
        <FormItem top="Регион">
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
                "edit-profile-modal",
              )
            }
            style={{ padding: 0 }}
          >
            {formData.region || "Не выбран"}
          </Cell>
        </FormItem>
        <FormItem top="О себе (Регалии)">
          <Textarea
            name="regalia"
            value={formData.regalia}
            onChange={handleChange}
            maxLength={500}
          />
        </FormItem>
        <FormItem top="Ссылка на соц. сеть">
          <Input
            name="social_link"
            value={formData.social_link}
            onChange={handleChange}
          />
        </FormItem>

        <Div>
          <Button
            size="l"
            stretched
            onClick={handleSaveClick}
            disabled={isSaving}
            loading={isSaving}
          >
            Отправить заявку
          </Button>
        </Div>
      </Group>
    </ModalPage>
  );
};
