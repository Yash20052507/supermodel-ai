import React from 'react';
import type { User, SkillPack, SupportTicket } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from './icons';

const MotionDiv = motion.div as any;

// --- Reusable Modal Components ---

const ModalShell: React.FC<{ children: React.ReactNode, title: string, onClose: () => void, footer?: React.ReactNode }> = ({ children, title, onClose, footer }) => (
    <AnimatePresence>
        <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <MotionDiv
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-slate-500"/>
                    </button>
                </header>
                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
                    {children}
                </div>
                {footer && (
                    <footer className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 flex flex-row-reverse border-t border-slate-200 dark:border-slate-700">
                        {footer}
                    </footer>
                )}
            </MotionDiv>
        </MotionDiv>
    </AnimatePresence>
);

const InfoRow: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="grid grid-cols-3 gap-4">
        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-sm text-slate-900 dark:text-slate-100 col-span-2">{children}</dd>
    </div>
);

const Switch: React.FC<{ isChecked: boolean, onToggle: () => void, disabled?: boolean }> = ({ isChecked, onToggle, disabled }) => (
    <button
        onClick={onToggle}
        disabled={disabled}
        className={`w-11 h-6 rounded-full transition-colors flex items-center p-1 flex-shrink-0 ${
          isChecked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
          isChecked ? 'translate-x-5' : 'translate-x-0'
        }`} />
    </button>
);


// --- Modal Implementations ---

interface UserDetailModalProps {
    user: User;
    onClose: () => void;
    onUpdateUser: (userId: string, updates: { is_creator: boolean }) => void;
}
export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose, onUpdateUser }) => (
    <ModalShell title={`User Details: ${user.name}`} onClose={onClose}>
        <dl>
            <InfoRow label="User ID">{user.id}</InfoRow>
            <InfoRow label="Email">{user.email}</InfoRow>
            <InfoRow label="Creator Status">
                <div className="flex items-center gap-2">
                    <Switch isChecked={!!user.isCreator} onToggle={() => onUpdateUser(user.id, { is_creator: !user.isCreator })} />
                    <span>{user.isCreator ? 'Enabled' : 'Disabled'}</span>
                </div>
            </InfoRow>
        </dl>
    </ModalShell>
);

interface SkillDetailModalProps {
    skill: SkillPack;
    onClose: () => void;
    onUpdateSkill: (skillId: string, updates: { is_featured?: boolean; status?: SkillPack['status'] }) => void;
    onDelete: (skill: SkillPack) => void;
}
export const SkillDetailModal: React.FC<SkillDetailModalProps> = ({ skill, onClose, onUpdateSkill, onDelete }) => (
    <ModalShell title={`Manage Skill: ${skill.name}`} onClose={onClose}>
         <dl>
            <InfoRow label="Skill ID">{skill.id}</InfoRow>
            <InfoRow label="Author">{skill.author}</InfoRow>
            <InfoRow label="Version">{skill.version}</InfoRow>
            <InfoRow label="Featured">
                <div className="flex items-center gap-2">
                    <Switch isChecked={!!skill.is_featured} onToggle={() => onUpdateSkill(skill.id, { is_featured: !skill.is_featured })} />
                    <span>{skill.is_featured ? 'Yes' : 'No'}</span>
                </div>
            </InfoRow>
             <InfoRow label="Publish Status">
                <select 
                    value={skill.status || 'published'} 
                    onChange={(e) => onUpdateSkill(skill.id, { status: e.target.value as SkillPack['status'] })}
                    className="p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                    <option value="archived">Archived</option>
                </select>
            </InfoRow>
        </dl>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
             <button
                onClick={() => onDelete(skill)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700"
            >
                <Trash2 className="w-4 h-4" /> Delete Skill Pack
            </button>
        </div>
    </ModalShell>
);

interface TicketDetailModalProps {
    ticket: SupportTicket;
    onClose: () => void;
    onUpdateStatus: (ticketId: string, status: 'open' | 'in_progress' | 'closed') => void;
    onDelete: (ticket: SupportTicket) => void;
}
export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose, onUpdateStatus, onDelete }) => (
    <ModalShell title={`Ticket: ${ticket.subject}`} onClose={onClose}>
        <dl>
            <InfoRow label="Ticket ID">{ticket.id}</InfoRow>
            <InfoRow label="User Email">{ticket.user_email}</InfoRow>
            <InfoRow label="Submitted">{new Date(ticket.created_at).toLocaleString()}</InfoRow>
            <InfoRow label="Type">{ticket.type}</InfoRow>
            <InfoRow label="Status">
                 <select 
                    value={ticket.status} 
                    onChange={(e) => onUpdateStatus(ticket.id, e.target.value as SupportTicket['status'])}
                    className="p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                </select>
            </InfoRow>
        </dl>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Description</h4>
            <p className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">{ticket.description}</p>
        </div>
         <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
             <button
                onClick={() => onDelete(ticket)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700"
            >
                <Trash2 className="w-4 h-4" /> Delete Ticket
            </button>
        </div>
    </ModalShell>
);

const AdminModals = { UserDetailModal, SkillDetailModal, TicketDetailModal };
export default AdminModals;