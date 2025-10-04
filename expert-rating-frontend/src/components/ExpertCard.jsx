// src/components/ExpertCard.jsx
import React from 'react';
import { Card, Avatar, ContentBadge, Title, Text, Div } from '@vkontakte/vkui';

export const ExpertCard = ({ expert, onClick }) => {
  // Защита от случая, если expert не передан
  if (!expert) {
    return null;
  }

  // Определяем, какие поля использовать (для совместимости с разными источниками данных)
  const name = expert.first_name || expert.name || '';
  const surname = expert.last_name || '';
  const photo = expert.photo_url || expert.photo || '';
  const rating = expert.rating !== undefined ? expert.rating : 'N/A';
  const topics = expert.topics || [];

  return (
    <Card
        mode="shadow"
        onClick={onClick}
    >
        <Div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <Avatar size={48} src={photo} />
            <div style={{ marginLeft: '12px' }}>
                <Title level="3" style={{ marginBottom: '4px' }}>{name} {surname}</Title>
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Рейтинг: {rating}</Text>
            </div>
        </Div>
        {topics.length > 0 && (
            <Div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: 0 }}>
                {topics.map(topic => (
                    <ContentBadge key={topic} mode="secondary">{topic}</ContentBadge>
                ))}
            </Div>
        )}
    </Card>
  );
};