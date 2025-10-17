import React, { useState } from 'react';
import { Gallery, Div, Title, Text, Button, FixedLayout, Separator, Headline } from '@vkontakte/vkui';
import { Icon16Done } from '@vkontakte/icons';
import bridge from '@vkontakte/vk-bridge';
import './Onboarding.css';

// --- Типизация входных данных ---
interface OnboardingProps {
    onFinish: () => void;
}

// --- Внутренние компоненты-иконки ---
const IconProfileCheck = () => <div className="onboarding-icon" style={{ backgroundColor: '#4CAF50' }}>✓</div>;
const IconCalendarPlus = () => <div className="onboarding-icon" style={{ backgroundColor: '#2196F3' }}>+</div>;
const IconChartUp = () => <div className="onboarding-icon" style={{ backgroundColor: '#FF9800' }}>↑</div>;
const IconNotifications = () => <div className="onboarding-icon" style={{ backgroundColor: '#3F8AE0' }}>🔔</div>;

// --- Основной компонент ---
export const Onboarding = ({ onFinish }: OnboardingProps) => {
    const [slideIndex, setSlideIndex] = useState(0);
    const [isPermissionGranted, setIsPermissionGranted] = useState(false);

    // Получаем ID группы из переменных окружения
    const groupId = Number(import.meta.env.VITE_VK_GROUP_ID);

    const handleAllowNotifications = async () => {
        console.log(`[Onboarding] Пытаемся запросить разрешение для группы с ID: ${groupId}`);

        if (!groupId) {
            console.error("[Onboarding] ОШИБКА: VITE_VK_GROUP_ID не определен в .env файле!");
            return;
        }

        try {
            // VK Bridge всегда ожидает положительный ID
            const result = await bridge.send('VKWebAppAllowMessagesFromGroup', { group_id: Math.abs(groupId) });

            if (result.result) {
                setIsPermissionGranted(true);
            } else {
                console.warn('[Onboarding] VK Bridge вернул отрицательный результат (возможно, пользователь отказался):', result);
            }
        } catch (error) {
            console.error('[Onboarding] ОШИБКА при вызове VKWebAppAllowMessagesFromGroup:', error);
        }
    };

    return (
        <div className="onboarding-container">
            <Gallery
                slideWidth="100%"
                align="center"
                onChange={setSlideIndex}
                slideIndex={slideIndex}
                style={{ height: '100%' }}
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

                {/* --- Слайд 4 (Уведомления) --- */}
                <div className="onboarding-slide">
                    <IconNotifications />
                    <Title level="1">Будь в курсе</Title>
                    <Headline weight="1" level="1" style={{ color: 'var(--vkui--color_text_secondary)' }}>Получай важные уведомления</Headline>
                    <Text>Разрешите отправку сообщений, чтобы мы могли уведомлять вас о статусе ваших заявок, новых голосах и других событиях в приложении.</Text>

                    {isPermissionGranted ? (
                        <Button
                            size="l"
                            mode="positive"
                            style={{ marginTop: 20 }}
                            disabled
                            before={<Icon16Done />}
                        >
                            Разрешение получено
                        </Button>
                    ) : (
                        <Button
                            size="l"
                            mode="secondary"
                            style={{ marginTop: 20 }}
                            onClick={handleAllowNotifications}
                            disabled={!groupId}
                        >
                            Разрешить уведомления
                        </Button>
                    )}
                </div>
            </Gallery>

            <FixedLayout vertical="bottom" filled>
                <Separator wide />
                <Div>
                    {slideIndex < 3 ? (
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