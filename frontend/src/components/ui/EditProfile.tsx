import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Clock, ChevronDown, Check } from 'lucide-react';

export interface ProfileData {
    fullName: string;
    email: string;
    timezone: string;
    workingHours: string;
    title: string;
    avatarUrl: string;
    lastUpdated: string;
}

interface EditProfileProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: ProfileData;
    onSave: (data: ProfileData) => void;
}

const SAMPLE_AVATARS = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80",
];

export const EditProfile: React.FC<EditProfileProps> = ({
    isOpen,
    onClose,
    initialData,
    onSave
}) => {
    const [formData, setFormData] = useState<ProfileData>(initialData);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setFormData(initialData));
            setShowAvatarPicker(false);
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        const now = new Date();
        const updated = {
            ...formData,
            lastUpdated: `Today at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        };
        onSave(updated);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    {/* Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 backdrop-blur-[2px] bg-black/40"
                    />

                    {/* Modal Container */}
                    <div className="relative w-full max-w-[720px] z-[101] my-auto pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300, mass: 0.8 }}
                            className="pointer-events-auto w-full rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] border overflow-hidden 
                                     bg-[#F5F5F7] border-[#E2E2E6] 
                                     text-[#131313]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 md:px-8 bg-white border-b border-[#EAE9F2]">
                                <div>
                                    <h2 className="text-[18px] font-bold text-[#182350]">Edit your profile</h2>
                                    <p className="text-xs text-[#737985] font-sans">Manage your fleet operator credentials & bridge status</p>
                                </div>
                                <button
                                    title="close"
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-[#FAFAF5] hover:bg-[#EAE9F2] text-[#737985] hover:text-[#182350] transition-colors flex items-center justify-center cursor-pointer border border-[#E2E2E6]"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex flex-col md:flex-row bg-[#FAFAF7]">
                                {/* Form Section */}
                                <div className="flex-1 p-6 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold uppercase tracking-wider text-[#555C68]">Full name</label>
                                        <input
                                            title="fullname"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-[14px] border-[1.5px] outline-none transition-all text-[15px] font-semibold
                                                     bg-white border-[#DFDDE6] text-[#131313] focus:border-[#182350]"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold uppercase tracking-wider text-[#555C68]">Email</label>
                                        <input
                                            title="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-[14px] border-[1.5px] outline-none font-semibold transition-all text-[15px]
                                                     bg-white border-[#DFDDE6] text-[#131313] focus:border-[#182350]"
                                        />
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[13px] font-bold uppercase tracking-wider text-[#555C68]">Timezone</label>
                                            <div className="relative">
                                                <select
                                                    title="timezone"
                                                    name="timezone"
                                                    value={formData.timezone}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2.5 rounded-[14px] border appearance-none outline-none text-[15px] font-semibold
                                                             bg-white border-[#DFDDE6] text-[#131313] focus:border-[#182350] cursor-pointer"
                                                >
                                                    <option value="UTC">UTC (Universal)</option>
                                                    <option value="GMT+5:30">GMT+5:30 (IST)</option>
                                                    <option value="GMT+5">GMT+5</option>
                                                    <option value="GMT-8">GMT-8 (PST)</option>
                                                    <option value="GMT+1">GMT+1 (CET)</option>
                                                    <option value="GMT+8">GMT+8 (SGT)</option>
                                                </select>
                                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#131313]/60" />
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[13px] font-bold uppercase tracking-wider text-[#555C68]">Working hours</label>
                                            <div className="relative">
                                                <input
                                                    title="workingHours"
                                                    name="workingHours"
                                                    value={formData.workingHours}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2.5 rounded-xl border outline-none text-[14px] font-semibold
                                                             bg-white border-[#DFDDE6] text-[#131313] focus:border-[#182350]"
                                                />
                                                <Clock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#131313]/50 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-bold uppercase tracking-wider text-[#555C68]">Title / Operational Role</label>
                                        <input
                                            title="title"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-[14px] border outline-none transition-all text-[14px] font-semibold
                                                     bg-white border-[#DFDDE6] text-[#131313] focus:border-[#182350]"
                                        />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="w-full h-[1px] md:h-auto md:w-[1px] border-t md:border-t-0 md:border-l border-dashed border-[#DFDDE6]" />

                                {/* Preview Section */}
                                <div className="flex-1 p-8 px-6 flex flex-col items-center justify-center bg-white">
                                    <span className="text-[12px] font-bold uppercase tracking-wider mb-4 text-[#737985]">Live Badge Preview</span>
                                    <div className="relative mb-4">
                                        <img
                                            src={formData.avatarUrl}
                                            alt="Avatar"
                                            className="w-28 h-28 rounded-full object-cover object-top shadow-md ring-4 ring-[#EAF4FE] border-2 border-[#182350]"
                                        />
                                        <button
                                            type="button"
                                            title="edit avatar"
                                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                            className="absolute bottom-0 right-0 p-2 rounded-full shadow-md border 
                                                     bg-[#182350] hover:bg-[#233373] border-white text-white transition-all cursor-pointer"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </div>

                                    {/* Avatar quick chooser */}
                                    {showAvatarPicker && (
                                        <div className="mb-3 p-2 rounded-xl bg-[#FAFAF5] border border-[#182350] flex items-center gap-2 animate-in fade-in zoom-in-95">
                                            {SAMPLE_AVATARS.map((url, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData((prev) => ({ ...prev, avatarUrl: url }));
                                                        setShowAvatarPicker(false);
                                                    }}
                                                    className="w-8 h-8 rounded-full overflow-hidden border-2 hover:scale-110 transition-transform cursor-pointer"
                                                    style={{ borderColor: formData.avatarUrl === url ? "#182350" : "#E2E2E6" }}
                                                >
                                                    <img src={url} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <h3 className="text-[17px] font-extrabold text-[#182350] text-center">{formData.fullName}</h3>
                                    <p className="text-[13px] font-medium text-[#737985] text-center mb-3">{formData.title}</p>
                                    
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold 
                                                 bg-[#EAF4FE] text-[#182350] border border-[#AFD2FA]">
                                        <Clock size={13} className="text-[#182350]" />
                                        <span>{formData.workingHours}</span>
                                    </div>

                                    <div className="mt-2 text-[11px] font-mono text-[#737985]">
                                        {formData.email} · {formData.timezone}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 md:px-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 bg-white border-t border-[#EAE9F2]">
                                <span className="text-[12px] text-[#737985]">
                                    Last updated: <span className="font-semibold text-[#182350]">{formData.lastUpdated}</span>
                                </span>
                                <div className="flex gap-2.5 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 sm:flex-none px-5 py-2 rounded-full text-[13px] border font-bold transition-colors cursor-pointer
                                                 bg-[#FAFAF5] hover:bg-[#ECE8DF] border-[#D1D5DB] text-[#555C68]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        className="flex-1 sm:flex-none px-6 py-2 rounded-full text-[13px] font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5
                                                 bg-[#182350] hover:bg-[#233373] text-white"
                                    >
                                        <Check size={14} />
                                        <span>Save changes</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EditProfile;
