// src/panels/Home.js
import React from 'react';
import { Panel, PanelHeader, Button, Group, Header } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

// В будущем здесь будет загрузка экспертов с API
const exampleExperts = [
    { id: 1, name: 'Иван Иванов', rating: 92, topics: ['Программист', 'Python'] },
    { id: 2, name: 'Мария Петрова', rating: 88, topics: ['Психолог'] },
];

export const Home = ({ id }) => {
    const routeNavigator = useRouteNavigator();

    return (
        <Panel id={id}>
            <PanelHeader>Рейтинг экспертов</PanelHeader>
            <Group>
                <Header 
                    aside={<Button onClick={() => routeNavigator.push('/registration')}>Стать экспертом</Button>}
                >
                    Топ экспертов
                </Header>
                {/* Здесь будет список карточек экспертов из mockups/index.html, 
                адаптированный под компоненты VKUI. Пока можно оставить так для проверки */}
            </Group>

             <Group header={<Header size="s">Navigation Example</Header>}>
                <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('/admin')}>
                    Перейти в админку (для теста)
                </Button>
            </Group>
        </Panel>
    );
};