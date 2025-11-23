import React, { useState, useMemo } from "react";
import {
  ModalPage,
  ModalPageHeader,
  PanelHeaderBack,
  Group,
  Search,
  SimpleCell,
  Div,
  Text,
} from "@vkontakte/vkui";
import { Icon24Done } from "@vkontakte/icons";

export interface Option {
  label: string;
  value: string | number;
}

interface SelectModalProps {
  id: string;
  onClose: () => void;
  title: string;
  options: Option[];
  selected: string | number | null;
  onSelect: (value: string | number) => void;
  searchable?: boolean;
}

export const SelectModal: React.FC<SelectModalProps> = ({
  id,
  onClose,
  title,
  options,
  selected,
  onSelect,
  searchable = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery]);

  const handleSelect = (value: string | number) => {
    onSelect(value);
    onClose();
  };

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader before={<PanelHeaderBack onClick={onClose} />}>
          {title}
        </ModalPageHeader>
      }
      settlingHeight={100}
    >
      <Group>
        {searchable && (
          <div style={{ padding: "0 12px 12px 12px" }}>
            <Search
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск"
            />
          </div>
        )}
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => (
            <SimpleCell
              key={option.value}
              onClick={() => handleSelect(option.value)}
              after={
                selected === option.value ? (
                  <Icon24Done fill="var(--vkui--color_icon_accent)" />
                ) : null
              }
            >
              {option.label}
            </SimpleCell>
          ))
        ) : (
          <Div>
            <Text
              style={{
                textAlign: "center",
                color: "var(--vkui--color_text_secondary)",
              }}
            >
              Ничего не найдено
            </Text>
          </Div>
        )}
      </Group>
    </ModalPage>
  );
};
