import React from "react";
import { Search, IconButton, Div } from "@vkontakte/vkui";
import { Icon28SlidersOutline } from "@vkontakte/icons";

interface SearchWithFiltersProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFiltersClick: () => void;
  placeholder?: string;
}

export const SearchWithFilters: React.FC<SearchWithFiltersProps> = ({
  searchQuery,
  onSearchChange,
  onFiltersClick,
  placeholder = "Поиск...",
}) => {
  return (
    <Div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0 16px",
      }}
    >
      <Search
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={placeholder}
        style={{ flexGrow: 1 }}
      />
      <IconButton onClick={onFiltersClick} aria-label="Открыть фильтры">
        <Icon28SlidersOutline />
      </IconButton>
    </Div>
  );
};
