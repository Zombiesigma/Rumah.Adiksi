import React from 'react';
import { ArtEvent } from '../types';

interface EventDetailProps {
  event: ArtEvent;
  onBack: () => void;
}

export default function EventDetail({ event, onBack }: EventDetailProps) {
  return (
    <div>
      <button onClick={onBack}>Back to Events</button>
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      {/* More details to be added here */}
    </div>
  );
}
