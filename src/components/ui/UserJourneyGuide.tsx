"use client";

import { UserIcon, CreditCardIcon, PlusCircleIcon, CurrencyDollarIcon, TrophyIcon } from '@heroicons/react/24/outline';

export function UserJourneyGuide() {
  const steps = [
    {
      icon: UserIcon,
      title: "Create Your Wallet",
      description: "Your wallet was created with your email at login and is accessible through OTP.",
      details: "Embedded wallets are self-custodial EOAs that work with one time passwords sent to your email. You are the sole owner of your assets but there are no seed phrases or browser extensions required."
    },
    {
      icon: CreditCardIcon,
      title: "Fund Your Wallet",
      description: "Get free testnet USDC to start betting. Visit CDP's faucet or use our built-in funding service.",
      details: "Each bet costs $1.00 USDC. Fund your wallet with testnet tokens (USDC & ETH on Base Sepolia Testnet) to begin making predictions.",
      link: "https://portal.cdp.coinbase.com/products/faucet"
    },
    {
      icon: PlusCircleIcon,
      title: "Create a Prediction",
      description: "Submit your own prediction market like \"Will Bitcoin be higher than $110,000 on September 10th, 2025?\"",
      details: "Set a clear question, choose an end date, and let others bet on the outcome. Markets are resolved by the Townhall admin after the closing date."
    },
    {
      icon: CurrencyDollarIcon,
      title: "Place Your Bet",
      description: "Choose YES or NO and place your $1.00 bet. You can only bet once per market, so choose wisely!",
      details: "Watch the odds change as others bet. The fewer people on your side, the bigger your potential winnings."
    },
    {
      icon: TrophyIcon,
      title: "Check Your Results",
      description: "After the market closes and resolves, see if you won! Winners share the losing side's pool proportionally.",
      details: "If you're the only one who bet correctly, you could win the entire pool!"
    }
  ];

  return (
    <div className="space-y-6 text-sm text-[#c0c0c0]">

      {/* Steps */}
      {steps.map((step, index) => (
        <section key={index} className="mb-6">
          <div className="mb-2 flex items-center">
            <step.icon className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0" />
            <h3 className="text-white font-semibold text-sm sm:text-base">{step.title}</h3>
          </div>
          
          <p className="text-[#c0c0c0] mb-2 leading-relaxed ml-8">
            {step.link ? (
              <>
                Get free testnet USDC to start betting. Visit{' '}
                <a 
                  href={step.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  CDP's faucet
                </a>
                {' '}or use our built-in funding service.
              </>
            ) : (
              step.description
            )}
          </p>
          
          <div className="bg-[#1a1a1a] border border-[#404040] rounded-lg p-3 ml-8">
            <div className="text-xs text-[#a0a0a0]">
              {step.details}
            </div>
          </div>
        </section>
      ))}

    </div>
  );
}