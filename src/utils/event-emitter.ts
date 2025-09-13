import EventEmitter from 'events';

declare global {
  var eventEmitter: EventEmitter;
}

if (!global.eventEmitter) {
  global.eventEmitter = new EventEmitter();
}

interface DashboardEvent {
  type: string;
  data?: Record<string, unknown>;
  message?: string;
  payload?: Record<string, unknown>;
}

export const sendEvent = (event: DashboardEvent) => {
  global.eventEmitter.emit('dashboardEvent', event);
};

export const getEventEmitter = () => global.eventEmitter;
