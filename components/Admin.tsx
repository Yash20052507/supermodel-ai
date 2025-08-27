import React, { useState, useEffect, useMemo } from 'react';
import type { User, SkillPack, SupportTicket } from '../types';
import { motion } from 'framer-motion';
import { UserIcon, Box, DollarSign, Shield, Loader2, Ticket, Trash2, Search } from './icons.tsx';
import * as dataService from '../services/dataService';
import { useToast } from '../hooks/useToast';
import AdminModals from './AdminModals';
import ConfirmationModal from './ConfirmationModal';


const MotionDiv = motion.div as any;

interface AdminDashboardData {
    users: User[];
    skills: SkillPack[];
    tickets: SupportTicket[];
}

interface AdminProps {
    user: User | null;
}

const Admin: React.FC<AdminProps> = ({ user }) => {
    const [data, setData] = useState<AdminDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'skills' | 'tickets'>('users');
    const { addToast } = useToast();

    // State for modals
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedSkill, setSelectedSkill] = useState<SkillPack | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'skill' | 'ticket', id: string, name: string } | null>(null);

    const fetchData = async () => {
        if (user?.isCreator) {
            try {
                setIsLoading(true);
                const adminData = await dataService.getAdminDashboardData();
                setData(adminData);
            } catch (error) {
                addToast({type: 'error', title: 'Error', message: 'Could not load admin data.'});
            } finally {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);
    
    // --- Handler Functions ---
    const handleUpdateUser = async (userId: string, updates: { is_creator: boolean }) => {
        try {
            const updatedUser = await dataService.updateUserAdmin(userId, updates);
            setData(prev => prev ? { ...prev, users: prev.users.map(u => u.id === userId ? updatedUser : u) } : null);
            setSelectedUser(updatedUser); // Keep modal updated
            addToast({type: 'success', title: 'User Updated!'});
        } catch (error) {
            addToast({type: 'error', title: 'Update Failed', message: error instanceof Error ? error.message : 'Could not update user.'});
        }
    };

    const handleUpdateSkill = async (skillId: string, updates: { is_featured?: boolean, status?: SkillPack['status'] }) => {
        try {
            await dataService.updateSkillPackAdmin(skillId, updates);
            setData(prev => {
                if (!prev) return null;
                const updatedSkills = prev.skills.map(s => s.id === skillId ? { ...s, ...updates } : s);
                const updatedSkill = updatedSkills.find(s => s.id === skillId);
                if (updatedSkill) {
                  setSelectedSkill(updatedSkill);
                }
                return { ...prev, skills: updatedSkills };
            });
            addToast({type: 'success', title: 'Skill Pack Updated!'});
        } catch(error) {
            addToast({type: 'error', title: 'Update Failed', message: error instanceof Error ? error.message : 'Could not update skill pack.'});
        }
    };
    
    const handleDeleteSkill = async (skillId: string) => {
        try {
            await dataService.deleteSkillPackAdmin(skillId);
            setData(prev => prev ? { ...prev, skills: prev.skills.filter(s => s.id !== skillId) } : null);
            addToast({type: 'success', title: 'Skill Pack Deleted!'});
        } catch (error) {
            addToast({type: 'error', title: 'Delete Failed', message: error instanceof Error ? error.message : 'Could not delete skill pack.'});
        } finally {
            setItemToDelete(null);
            setSelectedSkill(null);
        }
    };

    const handleUpdateTicketStatus = async (ticketId: string, status: 'open' | 'in_progress' | 'closed') => {
        try {
            await dataService.updateSupportTicketStatus(ticketId, status);
            setData(prev => {
                 if (!prev) return null;
                const updatedTickets = prev.tickets.map(t => t.id === ticketId ? {...t, status} : t);
                const updatedTicket = updatedTickets.find(t => t.id === ticketId);
                if (updatedTicket) {
                    setSelectedTicket(updatedTicket);
                }
                return { ...prev, tickets: updatedTickets };
            });
            addToast({type: 'success', title: 'Ticket Updated', message: `Ticket status set to ${status}.`});
        } catch (error) {
            addToast({type: 'error', title: 'Update Failed', message: error instanceof Error ? error.message : 'Could not update ticket.'});
        }
    };
    
    const handleDeleteTicket = async (ticketId: string) => {
        try {
            await dataService.deleteSupportTicket(ticketId);
            setData(prev => prev ? { ...prev, tickets: prev.tickets.filter(t => t.id !== ticketId) } : null);
            addToast({type: 'success', title: 'Ticket Deleted!'});
        } catch (error) {
            addToast({type: 'error', title: 'Delete Failed', message: error instanceof Error ? error.message : 'Could not delete ticket.'});
        } finally {
            setItemToDelete(null);
            setSelectedTicket(null);
        }
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'skill') {
            handleDeleteSkill(itemToDelete.id);
        } else if (itemToDelete.type === 'ticket') {
            handleDeleteTicket(itemToDelete.id);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
    }

    if (!user?.isCreator) {
        return <div className="text-center text-slate-500">You do not have permission to view this page.</div>;
    }

    return (
        <>
            <MotionDiv
              className="space-y-8 max-w-6xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Shield className="w-9 h-9 text-blue-500" />
                        Admin Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage users, skills, and platform settings.</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Total Users" value={data?.users.length.toString() || '0'} icon={UserIcon} />
                    <StatCard title="Skills Published" value={data?.skills.length.toString() || '0'} icon={Box} />
                    <StatCard title="Open Support Tickets" value={data?.tickets.filter(t => t.status === 'open').length.toString() || '0'} icon={Ticket} />
                </div>
                
                {/* Tabs */}
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <TabButton name="Users" icon={UserIcon} isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} count={data?.users.length} />
                        <TabButton name="Skill Packs" icon={Box} isActive={activeTab === 'skills'} onClick={() => setActiveTab('skills')} count={data?.skills.length} />
                        <TabButton name="Support Tickets" icon={Ticket} isActive={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} count={data?.tickets.length} />
                    </nav>
                </div>
                
                {/* Content */}
                <div>
                    {activeTab === 'users' && <UsersTable users={data?.users || []} onView={setSelectedUser} />}
                    {activeTab === 'skills' && <SkillsTable skills={data?.skills || []} onManage={setSelectedSkill} />}
                    {activeTab === 'tickets' && <TicketsTable tickets={data?.tickets || []} onView={setSelectedTicket} />}
                </div>
            </MotionDiv>

            {/* Modals */}
            {selectedUser && <AdminModals.UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdateUser={handleUpdateUser} />}
            {selectedSkill && <AdminModals.SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} onUpdateSkill={handleUpdateSkill} onDelete={(skill) => setItemToDelete({type: 'skill', id: skill.id, name: skill.name})} />}
            {selectedTicket && <AdminModals.TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onUpdateStatus={handleUpdateTicketStatus} onDelete={(ticket) => setItemToDelete({type: 'ticket', id: ticket.id, name: ticket.subject})} />}
            
            {itemToDelete && (
                <ConfirmationModal
                    isOpen={!!itemToDelete}
                    onClose={() => setItemToDelete(null)}
                    onConfirm={confirmDelete}
                    title={`Delete ${itemToDelete.type}`}
                    description={`Are you sure you want to permanently delete "${itemToDelete.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    icon={Trash2}
                    variant="danger"
                />
            )}
        </>
    );
};

// Sub-components
const StatCard: React.FC<{ title: string, value: string, icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700`}>
              <Icon className="w-6 h-6 text-slate-500 dark:text-slate-300" />
            </div>
        </div>
    </div>
);

const TabButton: React.FC<{ name: string, icon: React.ElementType, count?: number, isActive: boolean, onClick: () => void }> = ({ name, icon: Icon, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors
            ${isActive 
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' 
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
            }`}
    >
        <Icon className="w-4 h-4" />
        {name}
        {count !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                {count}
            </span>
        )}
    </button>
);

const ManagementTableShell: React.FC<{ children: React.ReactNode, headers: string[] }> = ({ children, headers }) => (
     <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                        {headers.map(h => <th key={h} scope="col" className="px-6 py-3">{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {children}
                </tbody>
            </table>
        </div>
    </div>
);

const UsersTable: React.FC<{users: User[], onView: (user: User) => void}> = ({ users, onView }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    return (
        <div className="space-y-4">
            <SearchInput placeholder="Search users by name or email..." value={searchTerm} onChange={setSearchTerm} />
            <ManagementTableShell headers={['Name', 'Email', 'Creator?', 'Actions']}>
                {filteredUsers.map(user => (
                    <tr key={user.id} className="bg-white dark:bg-slate-800/50 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{user.name}</td>
                        <td className="px-6 py-4">{user.email}</td>
                        <td className="px-6 py-4">{user.isCreator ? 'Yes' : 'No'}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => onView(user)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">View</button>
                        </td>
                    </tr>
                ))}
            </ManagementTableShell>
        </div>
    );
};

const SkillsTable: React.FC<{skills: SkillPack[], onManage: (skill: SkillPack) => void}> = ({ skills, onManage }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredSkills = useMemo(() => {
        return skills.filter(skill => 
            skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            skill.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
            skill.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [skills, searchTerm]);

    return (
        <div className="space-y-4">
            <SearchInput placeholder="Search skills by name, author, or category..." value={searchTerm} onChange={setSearchTerm} />
            <ManagementTableShell headers={['Name', 'Author', 'Category', 'Version', 'Actions']}>
                {filteredSkills.map(skill => (
                    <tr key={skill.id} className="bg-white dark:bg-slate-800/50 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{skill.name}</td>
                        <td className="px-6 py-4">{skill.author}</td>
                        <td className="px-6 py-4">{skill.category}</td>
                        <td className="px-6 py-4">{skill.version}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => onManage(skill)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Manage</button>
                        </td>
                    </tr>
                ))}
            </ManagementTableShell>
        </div>
    );
};

const TicketsTable: React.FC<{tickets: SupportTicket[], onView: (ticket: SupportTicket) => void}> = ({ tickets, onView }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => 
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ticket.user_email && ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [tickets, searchTerm]);

    return (
         <div className="space-y-4">
            <SearchInput placeholder="Search tickets by subject or user email..." value={searchTerm} onChange={setSearchTerm} />
            <ManagementTableShell headers={['Subject', 'User', 'Status', 'Submitted', 'Actions']}>
                {filteredTickets.map(ticket => (
                    <tr key={ticket.id} className="bg-white dark:bg-slate-800/50 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white truncate max-w-xs">{ticket.subject}</td>
                        <td className="px-6 py-4">{ticket.user_email}</td>
                        <td className="px-6 py-4"><StatusBadge status={ticket.status} /></td>
                        <td className="px-6 py-4">{new Date(ticket.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 space-x-2">
                            <button onClick={() => onView(ticket)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">View</button>
                        </td>
                    </tr>
                ))}
            </ManagementTableShell>
        </div>
    );
};

const StatusBadge: React.FC<{ status: SupportTicket['status'] }> = ({ status }) => {
    const colors = {
        open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
        closed: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>{status}</span>;
}

const SearchInput: React.FC<{ placeholder: string, value: string, onChange: (value: string) => void }> = ({ placeholder, value, onChange }) => (
    <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
            type="text" 
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent dark:text-slate-100"
        />
    </div>
);

export default Admin;