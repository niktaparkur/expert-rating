import React, { useState, useEffect } from "react";
import { FormLayoutGroup, FormItem, Select } from "@vkontakte/vkui";

interface CategoryData {
  id: number;
  name: string;
  items: { id: number; name: string }[];
}

interface AfishaFiltersProps {
  regions: string[];
  categories: CategoryData[];
  onFiltersChange: (filters: { region: string; category_id: string }) => void;
}

export const AfishaFilters = ({
  regions,
  categories,
  onFiltersChange,
}: AfishaFiltersProps) => {
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  useEffect(() => {
    onFiltersChange({
      region: selectedRegion,
      category_id: selectedCategoryId,
    });
  }, [selectedRegion, selectedCategoryId, onFiltersChange]);

  return (
    <FormLayoutGroup mode="horizontal">
      <FormItem top="Регион">
        <Select
          placeholder="Все регионы"
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          options={[
            { label: "Все регионы", value: "" },
            ...regions.map((r) => ({ label: r, value: r })),
          ]}
        />
      </FormItem>
      <FormItem top="Категория">
        <Select
          placeholder="Все категории"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          options={[
            { label: "Все категории", value: "" },
            ...categories.map((c) => ({
              label: c.name,
              value: String(c.id),
            })),
          ]}
        />
      </FormItem>
    </FormLayoutGroup>
  );
};
