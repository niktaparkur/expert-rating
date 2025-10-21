import React from "react";
import { Group } from "@vkontakte/vkui";
import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react";

import { VoteHistoryCard } from "../components/VoteHistoryCard";

const meta: Meta<typeof VoteHistoryCard> = {
  title: "Components/VoteHistoryCard",
  component: VoteHistoryCard,
  decorators: [
    (Story) => (
      <Group>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Story />
        </div>
      </Group>
    ),
  ],
  args: {
    onCancelVote: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof VoteHistoryCard>;

// --- MOCK DATA ---

const communityVoteTrust = {
  id: 1,
  vote_type: "trust",
  is_expert_vote: false,
  created_at: "2025-10-17T12:00:00Z",
  expert: {
    vk_id: 101,
    first_name: "Иван",
    last_name: "Иванов",
    photo_url: "https://avatar.iran.liara.run/public/31",
  },
  event: null,
};

const communityVoteDistrust = {
  ...communityVoteTrust,
  id: 2,
  vote_type: "distrust",
};

const eventVoteTrust = {
  id: 3,
  vote_type: "trust",
  is_expert_vote: true,
  created_at: "2025-10-16T18:30:00Z",
  expert: null,
  event: {
    id: 201,
    name: "Конференция Python Conf",
    expert_info: {
      vk_id: 102,
      first_name: "Мария",
      last_name: "Петрова",
      photo_url: "https://avatar.iran.liara.run/public/32",
    },
  },
};

const eventVoteDistrust = {
  ...eventVoteTrust,
  id: 4,
  vote_type: "distrust",
};

// --- STORIES ---

export const Default: Story = {
  render: (args) => (
    <>
      <VoteHistoryCard {...args} vote={communityVoteTrust} />
      <VoteHistoryCard {...args} vote={communityVoteDistrust} />
      <VoteHistoryCard {...args} vote={eventVoteTrust} />
      <VoteHistoryCard {...args} vote={eventVoteDistrust} />
    </>
  ),
};

export const CommunityVote: Story = {
  args: {
    vote: communityVoteTrust,
  },
};

export const EventVote: Story = {
  args: {
    vote: eventVoteTrust,
  },
};
