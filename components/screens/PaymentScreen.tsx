import React, { useState, useEffect, useRef } from 'react';
import { SpinnerIcon } from '../Icons';

// Define the shape of the reservation details passed to this screen
interface ReservationDetails {
    lotId: string;
    slotId: string;
    hours: number;
    amount: number;
    userId: string;
    email: string;
    lotName: string;
    destinationLat: number;
    destinationLng: number;
}

interface PaymentScreenProps {
    details: ReservationDetails;
    onSuccess: (details: { lotId: string, destination: { lat: number, lng: number } }) => void;
    onCancel: () => void;
}

const paymentMethods = [
    { name: 'EcoCash', currency: 'USD', backendName: 'ecocash', icon: 'https://www.vectorlogo.zone/logos/ecocash/ecocash-icon.svg', input: { type: 'tel', label: 'EcoCash Mobile Number' } },
    { name: 'Visa/Mastercard', currency: 'USD', backendName: 'visa', icon: 'https://www.vectorlogo.zone/logos/visa/visa-icon.svg', input: { type: 'redirect', content: 'You will be redirected to a secure gateway to enter your card details.' } },
    { name: 'InnBucks', currency: 'USD', backendName: 'innbucks', icon: 'https://play-lh.googleusercontent.com/AeL433s9-Y1Z_a_I2n31J_Scl2-S52J0I42i0e-wOQ9O6Y-m2bJfl-1BrQ=w240-h480-rw', input: { type: 'redirect', content: 'You will be redirected to a secure gateway to complete your InnBucks payment.' } },
];

const PaymentScreen = ({ details, onSuccess, onCancel }: PaymentScreenProps) => {
    const [view, setView] = useState<'options' | 'form'>('options');
    const [selectedMethod, setSelectedMethod] = useState<typeof paymentMethods[0] | null>(null);
    const [paymentInputValue, setPaymentInputValue] = useState('');
    
    // Status can be 'idle', 'loading', 'success', 'error'
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    const handleSelectMethod = (methodName: string) => {
        const method = paymentMethods.find(m => m.name === methodName);
        if (method) {
            setSelectedMethod(method);
            setView('form');
        }
    };

    const handleBackToOptions = () => {
        setView('options');
        setSelectedMethod(null);
        setPaymentInputValue('');
    };

    const handleSuccessfulPayment = () => {
        setStatus('success');
        setStatusMessage('Your spot is reserved. Showing route now...');
        setTimeout(() => {
            onSuccess({
                lotId: details.lotId,
                destination: { lat: details.destinationLat, lng: details.destinationLng }
            });
        }, 2500);
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMethod) return;

        if (selectedMethod.input.type === 'tel' && !/^(07[781356])\d{7}$/.test(paymentInputValue)) {
            alert("Please enter a valid Zimbabwean mobile number.");
            return;
        }

        setStatus('loading');
        setStatusMessage('Initiating secure payment...');

        try {
            const response = await fetch('/.netlify/functions/paynow-handler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod: selectedMethod.backendName,
                    currency: selectedMethod.currency,
                    paymentDetails: paymentInputValue,
                    ...details
                }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) throw new Error(result.message || 'Payment initiation failed.');

            if (result.redirectUrl) {
                setStatusMessage('Redirecting to payment gateway...');
                window.location.href = result.redirectUrl;
            } else if (result.pollUrl) {
                setStatusMessage('Please approve the transaction on your phone.');
                setTimeout(() => {
                    handleSuccessfulPayment();
                }, 15000); // 15 seconds delay
            } else {
                 throw new Error("Invalid response from server.");
            }
        } catch (error: any) {
            setStatus('error');
            setStatusMessage(error.message || 'An unknown error occurred.');
        }
    };
    
    const cardBaseStyle = "relative overflow-hidden bg-slate-900 rounded-xl border border-slate-700 w-full max-w-sm shadow-2xl";
    const cardContentStyle = "relative z-10 p-6";

    const renderStatusOverlay = () => {
        if (status === 'idle') return null;

        let icon, title, message;
        switch (status) {
            case 'loading':
                icon = <SpinnerIcon className="w-12 h-12 text-indigo-400" />;
                title = "Processing...";
                message = statusMessage;
                break;
            case 'success':
                icon = <ion-icon name="checkmark-circle" class="text-6xl text-emerald-400"></ion-icon>;
                title = "Payment Successful!";
                message = statusMessage;
                break;
            case 'error':
                icon = <ion-icon name="close-circle" class="text-6xl text-pink-500"></ion-icon>;
                title = "Payment Failed";
                message = statusMessage;
                break;
        }

        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className={`${cardBaseStyle} text-center`}>
                    <div className={cardContentStyle}>
                        <div className="flex flex-col items-center justify-center gap-4">
                           {icon}
                           <h2 className="text-2xl font-bold">{title}</h2>
                           <p className="text-slate-400">{message}</p>
                           {status === 'error' && (
                               <button onClick={() => setStatus('idle')} className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                   Try Again
                               </button>
                           )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPaymentForm = () => {
        if (!selectedMethod) return null;

        const { input } = selectedMethod;
        let formContent;

        if (input.type === 'tel') {
            formContent = (
                <div className="relative">
                    <input
                        type="tel"
                        value={paymentInputValue}
                        onChange={e => setPaymentInputValue(e.target.value)}
                        className="w-full bg-slate-800/50 text-white p-3 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={input.label}
                        required
                    />
                </div>
            );
        } else if (input.type === 'redirect') {
            formContent = <p className="text-center text-slate-400">{input.content}</p>;
        }

        return (
            <form onSubmit={handleSubmitPayment}>
                <div className="flex items-center gap-4 mb-6">
                    <button type="button" onClick={handleBackToOptions}><ion-icon name="arrow-back-outline" class="text-2xl text-slate-400 hover:text-white"></ion-icon></button>
                    <h3 className="font-semibold text-lg">Pay with {selectedMethod.name}</h3>
                </div>
                {formContent}
                <button type="submit" className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105">
                    {input.type === 'redirect' ? 'Proceed to Secure Gateway' : `Pay $${details.amount.toFixed(2)}`}
                </button>
            </form>
        );
    };

    return (
        <div className="bg-slate-950 text-white min-h-screen flex flex-col justify-center items-center p-4 animate-fade-in font-sans">
            {renderStatusOverlay()}
            <div className={cardBaseStyle}>
                <div className={cardContentStyle}>
                    {view === 'options' ? (
                        <>
                            <h2 className="text-xl font-bold">Reservation Payment</h2>
                            <p className="text-sm text-slate-400">For Spot {details.slotId.toUpperCase()} at {details.lotName}</p>
                            
                            <p className="text-4xl font-extrabold my-4">${details.amount.toFixed(2)}</p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {paymentMethods.map(method => (
                                    <button key={method.name} onClick={() => handleSelectMethod(method.name)} className="flex flex-col items-center justify-center p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-indigo-500 transition-colors">
                                        <img src={method.icon} alt={method.name} className="h-8 mb-2" />
                                        <span className="text-sm font-semibold">{method.name}</span>
                                    </button>
                                ))}
                            </div>

                            <button onClick={onCancel} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                Cancel
                            </button>
                        </>
                    ) : (
                        renderPaymentForm()
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentScreen;
