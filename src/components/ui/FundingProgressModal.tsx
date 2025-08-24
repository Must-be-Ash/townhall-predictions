"use client";

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AutoFundingStatus } from '@/hooks/useAutoFundingAuth';

interface FundingProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundingStatus: AutoFundingStatus;
  onRetry?: () => void;
}

export function FundingProgressModal({ isOpen, onClose, fundingStatus, onRetry }: FundingProgressModalProps) {
  const canClose = fundingStatus.status !== 'funding' && fundingStatus.status !== 'retrying';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={canClose ? onClose : () => {}}>
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#2a2a2a] border border-[#3a3a3a] p-6 text-left align-middle shadow-xl transition-all">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-bold text-white">
                    🎉 Welcome to Townhall Predictions!
                  </Dialog.Title>
                  {canClose && (
                    <button
                      onClick={onClose}
                      className="text-[#808080] hover:text-white transition-colors p-1"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Content based on funding status */}
                <div className="space-y-4">
                  {(fundingStatus.status === 'funding' || fundingStatus.status === 'retrying') && (
                    <div className="text-center">
                      {/* Loading Animation */}
                      <div className="mb-4">
                        <div className="relative w-16 h-16 mx-auto">
                          <div className="absolute inset-0 border-4 border-[#3a3a3a] rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {fundingStatus.status === 'retrying' ? 'Retrying...' : 'Setting up your wallet...'}
                      </h3>
                      <p className="text-[#c0c0c0] text-sm mb-4">
                        {fundingStatus.message || 'Getting your play money...'}
                      </p>
                      
                      {fundingStatus.attemptCount && fundingStatus.attemptCount > 1 && (
                        <p className="text-yellow-400 text-xs mb-2">
                          Attempt {fundingStatus.attemptCount} of 3
                        </p>
                      )}
                      
                      {/* Steps */}
                      <div className="text-left bg-[#1a1a1a] rounded-lg p-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                            <span className="text-[#c0c0c0]">Sending 0.0001 ETH for gas fees...</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                            <span className="text-[#c0c0c0]">Sending 2 USDC for betting...</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-[#3a3a3a] rounded-full mr-3"></div>
                            <span className="text-[#808080]">Ready to play!</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-[#808080] mt-4">
                        This may take a few seconds...
                      </p>
                    </div>
                  )}

                  {fundingStatus.status === 'completed' && (
                    <div className="text-center">
                      <div className="mb-4">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-2">
                        You&apos;re all set! 🎉
                      </h3>
                      <p className="text-[#c0c0c0] text-sm mb-4">
                        {fundingStatus.message}
                      </p>
                      
                      {/* Transaction Links */}
                      {fundingStatus.transactionHashes && (
                        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                          <h4 className="text-white font-medium mb-2">Transaction Details:</h4>
                          <div className="space-y-1 text-sm">
                            {fundingStatus.transactionHashes.eth && (
                              <a
                                href={`https://sepolia.basescan.org/tx/${fundingStatus.transactionHashes.eth}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-blue-400 hover:text-blue-300 underline"
                              >
                                View ETH transaction ↗
                              </a>
                            )}
                            {fundingStatus.transactionHashes.usdc && (
                              <a
                                href={`https://sepolia.basescan.org/tx/${fundingStatus.transactionHashes.usdc}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-blue-400 hover:text-blue-300 underline"
                              >
                                View USDC transaction ↗
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all"
                      >
                        Start Playing! 🚀
                      </button>
                    </div>
                  )}

                  {fundingStatus.status === 'failed' && (
                    <div className="text-center">
                      <div className="mb-4">
                        <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Funding Issue
                      </h3>
                      <p className="text-[#c0c0c0] text-sm mb-4">
                        {fundingStatus.message || 'We had trouble setting up your wallet automatically.'}
                      </p>
                      
                      {fundingStatus.error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                          <p className="text-red-400 text-sm">{fundingStatus.error}</p>
                        </div>
                      )}
                      
                      <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
                        <h4 className="text-white font-medium mb-2">No worries!</h4>
                        <p className="text-[#c0c0c0] text-sm">
                          You can get testnet tokens manually from the admin panel or ask an admin for help.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        {fundingStatus.isRetryable && onRetry && (
                          <button
                            onClick={onRetry}
                            className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-all"
                          >
                            Try Again
                          </button>
                        )}
                        <button
                          onClick={onClose}
                          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                        >
                          Continue to App
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer note */}
                <div className="mt-6 pt-4 border-t border-[#3a3a3a]">
                  <p className="text-xs text-[#808080] text-center">
                    This is Base Sepolia testnet - all tokens are for testing only
                  </p>
                </div>
                
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}