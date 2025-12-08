import React, { useState, useEffect } from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  Group,
  FormLayoutGroup,
  Div,
  Button,
  Cell,
} from "@vkontakte/vkui";
import { Icon24ChevronRight } from "@vkontakte/icons";
import { useFiltersStore, FiltersState } from "../../store/filtersStore";
import { Option } from "./SelectModal";

interface CategoryData {
  id: number;
  name: string;
  items: { id: number; name: string }[];
}

interface FiltersModalProps {
  id: string;
  onClose: () => void;
  filterType: "home" | "afisha";
  regions: string[];
  categories: CategoryData[];
  openSelectModal: (
    title: string,
    options: Option[],
    selected: string | number | null,
    onSelect: (val: any) => void,
    searchable?: boolean,
    fallbackModal?: string | null,
  ) => void;
}

export const FiltersModal: React.FC<FiltersModalProps> = ({
  id,
  onClose,
  filterType,
  regions,
  categories,
  openSelectModal,
}) => {
  const initialFilters = useFiltersStore((state) =>
    filterType === "home" ? state.homeFilters : state.afishaFilters,
  );
  const setFilters = useFiltersStore((state) =>
    filterType === "home" ? state.setHomeFilters : state.setAfishaFilters,
  );

  const [localFilters, setLocalFilters] =
    useState<FiltersState>(initialFilters);

  useEffect(() => {
    setLocalFilters(initialFilters);
  }, [initialFilters]);

  const handleFilterChange = (
    value: string,
    filterName: keyof FiltersState,
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FiltersState = { region: "", category_id: "" };
    setLocalFilters(resetFilters);
    setFilters(resetFilters);
    onClose();
  };

  const regionOptions = [
    { label: "Все регионы", value: "" },
    ...regions.map((r) => ({ label: r, value: r })),
  ];

  const categoryOptions = [
    { label: "Все категории", value: "" },
    ...categories.map((c) => ({
      label: c.name,
      value: String(c.id),
    })),
  ];

  const selectedRegionLabel =
    regionOptions.find((o) => o.value === localFilters.region)?.label ||
    "Все регионы";
  const selectedCategoryLabel =
    categoryOptions.find((o) => o.value === localFilters.category_id)?.label ||
    "Все категории";

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          Фильтры
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group>
        <FormLayoutGroup>
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
                localFilters.region,
                (val) => handleFilterChange(val, "region"),
                true,
                id,
              )
            }
            title="Регион"
          >
            {selectedRegionLabel}
          </Cell>
          <Cell
            after={
              <Icon24ChevronRight
                style={{ color: "var(--vkui--color_icon_secondary)" }}
              />
            }
            onClick={() =>
              openSelectModal(
                "Выберите категорию",
                categoryOptions,
                localFilters.category_id,
                (val) => handleFilterChange(val, "category_id"),
                true,
                id,
              )
            }
            title="Категория"
          >
            {selectedCategoryLabel}
          </Cell>
        </FormLayoutGroup>
      </Group>
      <Div style={{ display: "flex", gap: "8px" }}>
        <Button size="l" stretched mode="secondary" onClick={handleReset}>
          Сбросить
        </Button>
        <Button size="l" stretched onClick={handleApply}>
          Применить
        </Button>
      </Div>
    </ModalPage>
  );
};
