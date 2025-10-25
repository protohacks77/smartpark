
import React from 'react';
import type { Notice } from '../../types';
import { NewspaperIcon, SpinnerIcon } from '../Icons';

interface NoticeBoardScreenProps {
  notices: Notice[];
  isLoading: boolean;
}

const NoticeCard: React.FC<{ notice: Notice, className?: string }> = ({ notice, className = "" }) => {
  return (
    <div className={`group relative flex flex-col rounded-xl bg-white dark:bg-slate-950 p-4 shadow-lg dark:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/20 ${className}`}>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-20 dark:group-hover:opacity-30"></div>
      <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
      <div className="relative">
        <h2 className="font-bold text-lg mb-2 text-indigo-500 dark:text-indigo-400">{notice.title}</h2>
        <p className="text-gray-600 dark:text-slate-300 whitespace-pre-wrap mb-3">{notice.content}</p>
        <p className="text-xs text-right text-gray-400 dark:text-slate-500">{notice.timestamp.toDate().toLocaleString()}</p>
      </div>
    </div>
  );
};

const NoticeBoardScreen = ({ notices, isLoading }: NoticeBoardScreenProps) => {
  return (
    <div className="p-4 pt-24 pb-28 space-y-4 overflow-y-auto h-full animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 animate-slide-in-1">Notice Board</h1>
      {isLoading ? (
        <div className="text-center py-10">
          <SpinnerIcon className="w-8 h-8 mx-auto text-indigo-500 dark:text-indigo-400"/>
        </div>
      ) : notices.length > 0 ? (
        notices.map((notice, index) => (
          <NoticeCard key={notice.id} notice={notice} className={`animate-slide-in-${index + 2}`} />
        ))
      ) : (
        <div className="text-center py-10">
          <div className="flex justify-center mb-4">
            <NewspaperIcon className="w-16 h-16 text-gray-300 dark:text-slate-600" />
          </div>
          <p className="text-gray-500 dark:text-slate-400">No notices from admin at the moment.</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">Please check back later.</p>
        </div>
      )}
    </div>
  );
};

export default NoticeBoardScreen;
