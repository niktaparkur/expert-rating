import React, { useState } from 'react';
import { Gallery, Div, Title, Text, Button, FixedLayout, Separator, Headline } from '@vkontakte/vkui';
import './Onboarding.css';

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
                style={{ height: '100%' }} // Растягиваем галерею на всю высоту
            >
                {/* --- Слайд 1 --- */}
                <div className="onboarding-slide">
                    <IconProfileCheck />
                    <Title level="1">Стань экспертом</Title>
                    <Headline weight="1" level="1" style={{ color: 'var(--vkui--color_text_secondary)' }}>Твоя экспертность — ценность</Headline>
                    <Text>Пройди быструю регистрацию в мини-приложении VK и попади в национальную базу проверенных специалистов.</Text>
                </div>

                {/* --- Слайд 2 --- */}
                <div className="onboarding-slide">
                    <IconCalendarPlus />
                    <Title level="1">Делись знаниями</Title>
                    <Headline weight="1" level="1" style={{ color: 'var(--vkui--color_text_secondary)' }}>Создавай свои мероприятия</Headline>
                    <Text>Проводи вебинары, мастер-классы или запиши видеоурок — и монетизируй свои знания.</Text>
                </div>

                {/* --- Слайд 3 --- */}
                <div className="onboarding-slide">
                    <IconChartUp />
                    <Title level="1">Зарабатывай репутацию</Title>
                    <Headline weight="1" level="1" style={{ color: 'var(--vkui--color_text_secondary)' }}>Расти в рейтинге. Получай доверие.</Headline>
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