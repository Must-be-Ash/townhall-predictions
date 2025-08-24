"use client";

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
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
              <Dialog.Panel className="w-full max-w-md sm:max-w-lg transform overflow-hidden rounded-2xl bg-[#2a2a2a] border border-[#3a3a3a] p-6 text-left align-middle shadow-xl transition-all">
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

                {/* Content */}
                <div className="space-y-6 text-sm text-[#c0c0c0]">
                  {/* Basic Rules */}
                  <section>
                    <h3 className="text-white font-semibold mb-3 text-base">Basic Rules</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        <span><strong className="text-white">Fixed bet:</strong> Each bet costs exactly $1.00 USDC</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        <span><strong className="text-white">One bet per market:</strong> You can only place one bet per market</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        <span><strong className="text-white">Time limit:</strong> Betting closes when the market expires</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        <span><strong className="text-white">Market creation:</strong> Anyone can create markets, only admin resolves them</span>
                      </li>
                    </ul>
                  </section>

                  {/* Winning Scenarios */}
                  <section>
                    <h3 className="text-white font-semibold mb-3 text-base">Winning Scenarios</h3>
                    <div className="space-y-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div className="font-medium text-green-400 mb-1">Maximum Win</div>
                        <div className="text-xs">Everyone bets YES, you bet NO, and NO wins → You get the entire pool!</div>
                      </div>
                      
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div className="font-medium text-green-400 mb-1">Balanced Win</div>
                        <div className="text-xs">Mixed betting, you pick the winning side → Share the pool proportionally</div>
                      </div>
                      
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div className="font-medium text-green-400 mb-1">Crowd Win</div>
                        <div className="text-xs">Everyone bets the same side and wins → Everyone gets $1.00 back</div>
                      </div>
                    </div>
                  </section>

                  {/* Losing Scenarios */}
                  <section>
                    <h3 className="text-white font-semibold mb-3 text-base">Losing Scenarios</h3>
                    <div className="space-y-3">
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="font-medium text-red-400 mb-1">Wrong Side</div>
                        <div className="text-xs">You bet on the losing side → You lose your $1.00</div>
                      </div>
                      
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="font-medium text-red-400 mb-1">House Wins</div>
                        <div className="text-xs">Everyone bets one side, opposite side wins → House keeps the pool</div>
                      </div>
                    </div>
                  </section>

                  {/* Special Cases */}
                  <section>
                    <h3 className="text-white font-semibold mb-3 text-base">Special Cases</h3>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="font-medium text-purple-400 mb-1">Market Voided</div>
                      <div className="text-xs">If a market is voided due to disputes or issues → Everyone gets their $1.00 refunded</div>
                    </div>
                  </section>

                  {/* Pro Tip */}
                  <section className="pt-2 border-t border-[#3a3a3a]">
                    <div className="bg-[#1a1a1a] border border-[#404040] rounded-lg p-3">
                      <div className="font-medium text-[#ffffff] mb-1">💡 Pro Tip</div>
                      <div className="text-xs text-[#a0a0a0]">
                        The more unbalanced the betting, the higher your potential winnings if you pick the minority side correctly!
                      </div>
                    </div>
                  </section>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-[#3a3a3a]">
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