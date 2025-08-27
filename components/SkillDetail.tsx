import React, { useState, useEffect } from 'react';
import type { SkillPack, SkillPackReview, User } from '../types';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Download, Loader2, Star, UserCircle } from './icons';
import StarRating from './StarRating';
import * as dataService from '../services/dataService';
import { useToast } from '../hooks/useToast';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;

interface SkillDetailProps {
    skillPack: SkillPack;
    user: User | null;
    onBack: () => void;
    onInstall: (id: string) => void;
    onAddReview: (review: { skill_pack_id: string; rating: number; content: string; }) => Promise<SkillPackReview>;
}

const SkillDetail: React.FC<SkillDetailProps> = ({ skillPack, user, onBack, onInstall, onAddReview }) => {
    const [reviews, setReviews] = useState<SkillPackReview[]>([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchReviews = async () => {
            setIsLoadingReviews(true);
            try {
                const fetchedReviews = await dataService.getReviewsForSkill(skillPack.id);
                setReviews(fetchedReviews);
            } catch (error) {
                addToast({ type: 'error', title: 'Error', message: 'Could not load reviews.' });
            } finally {
                setIsLoadingReviews(false);
            }
        };
        fetchReviews();
    }, [skillPack.id, addToast]);
    
    const handleReviewSubmit = async (rating: number, content: string) => {
        try {
           const newReview = await onAddReview({ skill_pack_id: skillPack.id, rating, content });
           setReviews(prev => [newReview, ...prev]);
           addToast({ type: 'success', title: 'Review Submitted!', message: 'Thank you for your feedback.' });
        } catch (error) {
           addToast({ type: 'error', title: 'Submission Failed', message: error instanceof Error ? error.message : 'Could not submit your review.' });
        }
    };
    
    const userHasReviewed = user && reviews.some(r => r.user_id === user.id);

    return (
        <MotionDiv
          className="max-w-4xl mx-auto space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
            <div>
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Marketplace
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/3 text-center">
                        <div className="text-8xl mb-4">{skillPack.icon}</div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{skillPack.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">by {skillPack.author}</p>
                        <div className="mt-4">
                            <InstallButton skillPack={skillPack} onInstall={onInstall} />
                        </div>
                    </div>
                    <div className="md:w-2/3">
                        <p className="text-slate-600 dark:text-slate-300 mb-6">{skillPack.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <Stat title="Category" value={skillPack.category} />
                            <Stat title="Version" value={skillPack.version} />
                            <Stat title="Downloads" value={skillPack.downloads.toLocaleString()} />
                            <Stat title="Price" value={skillPack.purchase_type === 'free' ? 'Free' : `$${skillPack.price.toFixed(2)}`} />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <Star className="w-6 h-6 text-amber-400"/>
                        Ratings & Reviews
                    </h2>
                     <div className="flex items-center gap-2 mt-2 text-slate-600 dark:text-slate-400">
                        <StarRating rating={skillPack.average_rating || 0} />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{(skillPack.average_rating || 0).toFixed(1)}</span>
                        <span>({skillPack.review_count} reviews)</span>
                    </div>
                </div>
                <div className="p-6">
                    {skillPack.isInstalled && !userHasReviewed && <ReviewForm onSubmit={handleReviewSubmit} />}
                    {userHasReviewed && <p className="text-center text-sm p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">You've already reviewed this skill. Thank you!</p>}
                    
                    <div className="mt-6 space-y-6 divide-y divide-slate-200 dark:divide-slate-700">
                        {isLoadingReviews ? (
                            <div className="text-center py-8"><Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500" /></div>
                        ) : reviews.length > 0 ? (
                            reviews.map(review => <ReviewCard key={review.id} review={review} />)
                        ) : (
                            <p className="text-center py-8 text-slate-500 dark:text-slate-400">No reviews yet. Be the first to leave one!</p>
                        )}
                    </div>
                </div>
            </div>

        </MotionDiv>
    );
};

const Stat: React.FC<{title: string, value: string}> = ({ title, value }) => (
    <div>
        <h4 className="text-slate-500 dark:text-slate-400 font-semibold">{title}</h4>
        <p className="text-slate-800 dark:text-slate-200 font-medium">{value}</p>
    </div>
);

const InstallButton: React.FC<{ skillPack: SkillPack, onInstall: (id: string) => void}> = ({ skillPack, onInstall }) => {
    if (skillPack.isInstalled) {
        return (
             <div className="inline-flex items-center gap-2 px-6 py-3 text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 rounded-lg font-semibold">
                <CheckCircle className="w-5 h-5"/> Installed
            </div>
        );
    }
    return (
        <button
            onClick={() => onInstall(skillPack.id)}
            className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
            <Download className="w-5 h-5"/>
            Install Skill
        </button>
    );
};

const ReviewCard: React.FC<{ review: SkillPackReview }> = ({ review }) => (
    <div className="pt-6 first:pt-0">
        <div className="flex items-center gap-3">
            <UserCircle className="w-10 h-10 text-slate-400" />
            <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">{review.user_name}</h4>
                <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
        {review.content && <p className="mt-3 text-slate-600 dark:text-slate-300">{review.content}</p>}
    </div>
);

const ReviewForm: React.FC<{ onSubmit: (rating: number, content: string) => void }> = ({ onSubmit }) => {
    const [rating, setRating] = useState(0);
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;
        setIsSubmitting(true);
        onSubmit(rating, content);
        setIsSubmitting(false);
        setRating(0);
        setContent('');
    };
    
    return (
        <form onSubmit={handleSubmit} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Leave a Review</h3>
            <div className="my-2">
                <StarRating rating={rating} onRatingChange={setRating} interactive />
            </div>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts... (optional)"
                rows={3}
                className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-right mt-2">
                <button
                    type="submit"
                    disabled={rating === 0 || isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
            </div>
        </form>
    );
}

export default SkillDetail;