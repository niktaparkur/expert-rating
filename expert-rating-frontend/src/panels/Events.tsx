import React, { useState, useEffect, ReactNode } from "react";
import {
  Panel,
  PanelHeader,
  Group,
  Header,
  Button,
  Spinner,
  Div,
  Text,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  SimpleCell,
  InfoRow,
} from "@vkontakte/vkui";
import { useRouteNavigator } from "@vkontakte/vk-mini-apps-router";
import QRCode from "react-qr-code";
import { useApi } from "../hooks/useApi";
import { Icon24CalendarOutline, Icon24Link } from "@vkontakte/icons";
import { EventData, UserData } from "../types";
import { EventDashboardCard } from "../components/Event/EventDashboardCard";

const APP_URL = `https://vk.com/app${import.meta.env.VITE_VK_APP_ID}`;

interface PublicEventCardProps {
  event: EventData;
}

const PublicEventCard = ({ event }: PublicEventCardProps) => {
  return (
    <Group mode="card" header={<Header>{event.name}</Header>}>
      <SimpleCell before={<Icon24CalendarOutline />} multiline>
        <InfoRow header="Дата">
          {new Date(event.event_date + "Z").toLocaleString("ru-RU", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </InfoRow>
      </SimpleCell>
      {event.event_link && (
        <SimpleCell
          before={<Icon24Link />}
          href={String(event.event_link)}
          target="_blank"
          chevron="always"
        >
          <InfoRow header="Ссылка на мероприятие">Перейти</InfoRow>
        </SimpleCell>
      )}
    </Group>
  );
};

interface EventsProps {
  id: string;
  user: UserData | null;
}

export const Events = ({ id, user }: EventsProps) => {
  const routeNavigator = useRouteNavigator();
  const { apiGet } = useApi();

  const [myEvents, setMyEvents] = useState<EventData[]>([]);
  const [publicEvents, setPublicEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);

  const isExpert = user?.is_expert;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchAllEvents() {
      setLoading(true);
      setError(null);
      try {
        if (isExpert) {
          const [myEventsData, publicEventsData] = await Promise.all([
            apiGet<EventData[]>("/events/my"),
            apiGet<EventData[]>("/events/public"),
          ]);
          setMyEvents(myEventsData);
          setPublicEvents(publicEventsData);
        } else {
          const publicEventsData = await apiGet<EventData[]>("/events/public");
          setPublicEvents(publicEventsData);
        }
      } catch (err: any) {
        setError(err.message);
        console.error(`Failed to fetch events:`, err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllEvents();
  }, [apiGet, isExpert, user]);

  const openEventModal = (event: EventData) => {
    setSelectedEvent(event);
    setActiveModal("event-qr-modal");
  };
  const closeModal = () => setActiveModal(null);

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={closeModal}>
      <ModalPage
        id="event-qr-modal"
        onClose={closeModal}
        header={<ModalPageHeader>QR-код для голосования</ModalPageHeader>}
        settlingHeight={100}
      >
        {selectedEvent && (
          <Group>
            <Div style={{ textAlign: "center" }}>
              <Header>Название мероприятия</Header>
              <Text weight="1" style={{ marginBottom: "8px" }} useAccentWeight>
                {selectedEvent.name}
              </Text>
              <Header style={{ marginTop: "16px" }}>Промо-слово</Header>
              <Text weight="1" style={{ marginBottom: "16px" }} useAccentWeight>
                <strong>{selectedEvent.promo_word}</strong>
              </Text>
              <div
                id="qr-code-to-download"
                style={{
                  background: "white",
                  padding: "16px",
                  margin: "16px auto",
                  display: "inline-block",
                }}
              >
                <QRCode
                  value={`${APP_URL}#/vote/${selectedEvent.promo_word}`}
                  size={192}
                />
              </div>
              <Text>Покажите этот QR-код участникам для голосования.</Text>
            </Div>
          </Group>
        )}
      </ModalPage>
    </ModalRoot>
  );

  const renderMyEvents = () => (
    <>
      <Header>Мои мероприятия</Header>
      {myEvents.length > 0 ? (
        myEvents.map((event) => (
          <EventDashboardCard
            key={event.id}
            event={event}
            onShowQrClick={openEventModal}
          />
        ))
      ) : (
        <Group>
          <Div>
            <Text>У вас пока нет созданных мероприятий.</Text>
          </Div>
        </Group>
      )}
    </>
  );

  const renderPublicEvents = () => (
    <>
      <Header>Ближайшие публичные мероприятия</Header>
      {publicEvents.length > 0 ? (
        publicEvents.map((event) => (
          <PublicEventCard key={event.id} event={event} />
        ))
      ) : (
        <Group>
          <Div>
            <Text>
              В ближайшее время публичных мероприятий не запланировано.
            </Text>
          </Div>
        </Group>
      )}
    </>
  );

  return (
    <Panel id={id}>
      {modal}
      <PanelHeader>Мероприятия</PanelHeader>

      {isExpert && (
        <Group>
          <Div>
            <Button
              stretched
              size="l"
              mode="primary"
              onClick={() => routeNavigator.push("/create-event")}
            >
              Создать новое мероприятие
            </Button>
          </Div>
        </Group>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingBottom: "60px",
        }}
      >
        {loading && <Spinner />}
        {error && (
          <Div>
            <Text style={{ color: "red" }}>{error}</Text>
          </Div>
        )}
        {!loading &&
          !error &&
          (isExpert ? (
            <>
              {renderMyEvents()}
              {renderPublicEvents()}
            </>
          ) : (
            renderPublicEvents()
          ))}
      </div>
    </Panel>
  );
};
