import { TodaAuditLog } from '../types/toda';
import { MOCK_TODA_AUDIT_LOGS, CURRENT_TODA_ADMIN } from '../mockData/todaData';

let auditLogs: TodaAuditLog[] = [...MOCK_TODA_AUDIT_LOGS];
const listeners = new Set<() => void>();

export const getAuditLogs = (): TodaAuditLog[] => {
  return [...auditLogs];
};

export const subscribeAuditLogs = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
};

export interface LogTodaActionParams {
  actionType: string;
  targetId: string;
  targetName: string;
  details: string;
  category?: TodaAuditLog['category'];
  actorName?: string;
  todaAdminId?: string;
}

export const logTodaAction = ({
  actionType,
  targetId,
  targetName,
  details,
  category = 'Operations',
  actorName = CURRENT_TODA_ADMIN.name,
  todaAdminId = CURRENT_TODA_ADMIN.id,
}: LogTodaActionParams): TodaAuditLog => {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const newLog: TodaAuditLog = {
    id: `TLOG-${Date.now()}`,
    log_id: `TAUD-${Math.floor(100 + Math.random() * 900)}`,
    toda_admin_id: todaAdminId,
    actor_name: actorName,
    action_type: actionType,
    target_id: targetId,
    target_name: targetName,
    details,
    performed_at: `${formattedDate} • ${formattedTime}`,
    category,
  };

  auditLogs = [newLog, ...auditLogs];
  notifyListeners();
  return newLog;
};
