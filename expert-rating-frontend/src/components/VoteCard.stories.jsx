import React from 'react';
import { fn } from 'storybook/test';
import { VoteCard } from './VoteCard.jsx';

export default {
    title: 'Components/VoteCard',
    component: VoteCard,
};

export const NarodVote = {
    args: {
        title: "Народное голосование",
        subtitle: "Ваш голос и отзыв помогут другим пользователям.",
        onSubmit: fn(),
        voteType: "narod"
    }
};

export const ExpertVote = {
    args: {
        title: "Экспертное голосование",
        subtitle: "Ваш голос будет учтён в рейтинге экспертов.",
        onSubmit: fn(),
        voteType: "expert"
    }
};

export const VotedNarod = {
    args: {
        title: "Народное голосование",
        voted: true,
        voteType: "narod",
        onSubmit: fn(),
    }
};

export const VotedExpert = {
    args: {
        title: "Экспертное голосование",
        voted: true,
        voteType: "expert",
        onSubmit: fn(),
    }
};

export const DisabledVote = {
    args: {
        title: "Голосование завершено",
        subtitle: "Вы уже не можете проголосовать.",
        onSubmit: fn(),
        disabled: true,
    }
};
