import React, { useState, useEffect } from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  Group,
  FormLayoutGroup,
  FormItem,
  Select,
  Div,
  Button,
} from "@vkontakte/vkui";
import { useFiltersStore, FiltersState } from "../../store/filtersStore";

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
}

export const FiltersModal: React.FC<FiltersModalProps> = ({
  id,
  onClose,
  filterType,
  regions,
  categories,
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
    e: React.ChangeEvent<HTMLSelectElement>,
    filterName: keyof FiltersState,
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [filterName]: e.target.value,
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
          <FormItem top="Регион">
            <Select
              placeholder="Все регионы"
              value={localFilters.region}
              onChange={(e) => handleFilterChange(e, "region")}
              options={[
                { label: "Все регионы", value: "" },
                ...regions.map((r) => ({ label: r, value: r })),
              ]}
              searchable
            />
          </FormItem>
          <FormItem top="Категория">
            <Select
              placeholder="Все категории"
              value={localFilters.category_id}
              onChange={(e) => handleFilterChange(e, "category_id")}
              options={[
                { label: "Все категории", value: "" },
                ...categories.map((c) => ({
                  label: c.name,
                  value: String(c.id),
                })),
              ]}
              searchable
            />
          </FormItem>
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
