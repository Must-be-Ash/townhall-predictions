"use client";

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { TradingRules } from './TradingRules';
import { UserJourneyGuide } from './UserJourneyGuide';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'guide'>('rules');

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md sm:max-w-lg lg:max-w-2xl transform overflow-hidden rounded-2xl bg-[#2a2a2a] border border-[#3a3a3a] p-4 sm:p-6 text-left align-middle shadow-xl transition-all max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-bold text-white flex items-center">
                    <InformationCircleIcon className="w-6 h-6 text-blue-400 mr-2" />
                    How It Works
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-[#808080] hover:text-white transition-colors p-1"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Toggle */}
                <div className="flex mb-6 bg-[#1a1a1a] border border-[#404040] rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('rules')}
                    className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'rules'
                        ? 'bg-gradient-to-r from-[#4a4a4a] to-[#606060] text-white shadow-lg'
                        : 'text-[#808080] hover:text-white'
                    }`}
                  >
                    <span className="hidden sm:inline">Trading Rules</span>
                    <span className="sm:hidden">Rules</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('guide')}
                    className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'guide'
                        ? 'bg-gradient-to-r from-[#4a4a4a] to-[#606060] text-white shadow-lg'
                        : 'text-[#808080] hover:text-white'
                    }`}
                  >
                    <span className="hidden sm:inline">Getting Started</span>
                    <span className="sm:hidden">Guide</span>
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-transparent pr-2 -mr-2">
                  {activeTab === 'rules' ? <TradingRules /> : <UserJourneyGuide />}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-[#3a3a3a] flex-shrink-0">
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 text-white text-sm font-bold rounded-lg transition-all border border-[#808080] border-[0.1px]"
                    style={{
                      background: 'radial-gradient(circle, #333333 0%, #555555 100%)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'radial-gradient(circle, #555555 0%, #777777 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'radial-gradient(circle, #333333 0%, #555555 100%)';
                    }}
                  >
                    Got it!
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}