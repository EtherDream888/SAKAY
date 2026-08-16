import { AuditLogRecord, MOCK_AUDIT_LOGS, CURRENT_ADMIN } from '../mockData/adminData';

// In-memory array initialized with mock seed data
let auditLogs: AuditLogRecord[] = [...MOCK_AUDIT_LOGS];

// Set of listeners for live updates during session
const listeners = new Set<() => void>();

export const getAuditLogs = (): AuditLogRecord[] => {
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

export interface LogActionParams {
  actionType: string;
  targetId: string;
  targetName: string;
  details: string;
  category?: AuditLogRecord['category'];
  actorName?: string;
  actorRole?: string;
  lguAdminId?: string;
}

export const logAdminAction = ({
  actionType,
  targetId,
  targetName,
  details,
  category = 'System',
  actorName = CURRENT_ADMIN.name,
  actorRole = CURRENT_ADMIN.role,
  lguAdminId = CURRENT_ADMIN.id,
}: LogActionParams): AuditLogRecord => {
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

  const newLog: AuditLogRecord = {
    id: `LOG-${Date.now()}`,
    log_id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
    lgu_admin_id: lguAdminId,
    actor_name: actorName,
    actor_role: actorRole,
    action_type: actionType,
    target_id: targetId,
    target_name: targetName,
    details,
    performed_at: `${formattedDate} • ${formattedTime}`,
    category,
  };

  // Prepend to top of logs
  auditLogs = [newLog, ...auditLogs];
  notifyListeners();
  return newLog;
};
