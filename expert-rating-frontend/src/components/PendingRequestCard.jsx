import React from 'react';
import { Group, Placeholder, Button, Spinner } from '@vkontakte/vkui';
import { Icon56RecentOutline } from '@vkontakte/icons';

export const PendingRequestCard = ({ onWithdraw, isLoading }) => {
    return (
        <Group>
            <Placeholder
                icon={<Icon56RecentOutline />}
                header="Заявка на модерации"
                action={
                    <Button
                        size="m"
                        mode="destructive"
                        onClick={onWithdraw}
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="small" /> : 'Отозвать заявку'}
                    </Button>
                }
            >
                Ваша анкета находится на рассмотрении. Вы можете отозвать заявку, чтобы внести изменения и подать ее заново.
            </Placeholder>
        </Group>
    );
};