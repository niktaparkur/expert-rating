import React, { useState } from 'react';
import { Gallery, Div, Title, Text, Button, FixedLayout, Separator } from '@vkontakte/vkui';
import './Onboarding.css'; // Подключим стили

// Заглушки для иконок. В идеале их нужно нарисовать.
const IconProfileCheck = () => <div className="onboarding-icon" style={{ backgroundColor: '#4CAF50' }}>✓</div>;
const IconCalendarPlus = () => <div className="onboarding-icon" style={{ backgroundColor: '#2196F3' }}>+</div>;
const IconChartUp = () => <div className="onboarding-icon" style={{ backgroundColor: '#FF9800' }}>↑</div>;

export const Onboarding = ({ onFinish }) => {
    const [slideIndex, setSlideIndex] = useState(0);

    return (
        <div className="onboarding-container">
            <Gallery
                slideWidth="100%"
                align="center"
                onChange={setSlideIndex}
                slideIndex={slideIndex}
            >
                <div className="onboarding-slide">
                    <IconProfileCheck />
                    <Title level="1">Твоя экспертность — ценность</Title>
                    <Text>Пройди быструю регистрацию в мини-приложении VK и попади в национальную базу проверенных специалистов.</Text>
                </div>
                <div className="onboarding-slide">
                    <IconCalendarPlus />
                    <Title level="1">Создавай свои мероприятия</Title>
                    <Text>Проводи вебинары, мастер-классы или запиши видеоурок — и монетизируй свои знания.</Text>
                </div>
                <div className="onboarding-slide">
                    <IconChartUp />
                    <Title level="1">Расти в рейтинге. Получай доверие.</Title>
                    <Text>Участвуй в голосовании, получай честные отзывы и повышай свой статус. Стань экспертом для таких событий, как Росконгресс.</Text>
                </div>
            </Gallery>

            <FixedLayout vertical="bottom" filled>
                <Separator wide />
                <Div>
                    {slideIndex < 2 ? (
                        <Button size="l" stretched mode="primary" onClick={() => setSlideIndex(slideIndex + 1)}>
                            Далее
                        </Button>
                    ) : (
                        <Button size="l" stretched mode="commerce" onClick={onFinish}>
                            Начать
                        </Button>
                    )}
                </Div>
            </FixedLayout>
        </div>
    );
};