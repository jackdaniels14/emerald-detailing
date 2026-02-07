'use client';

import { useState } from 'react';

interface ShareLinksProps {
  referralCode: string;
}

export default function ShareLinks({ referralCode }: ShareLinksProps) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const referralLink = `https://emeralddetailers.com/book?ref=${referralCode}`;

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Share Your Referral</h2>

      <div className="space-y-4">
        {/* Referral Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referral Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600"
            />
            <button
              onClick={() => copyToClipboard(referralLink, 'link')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copied === 'link'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {copied === 'link' ? (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </span>
              ) : (
                'Copy'
              )}
            </button>
          </div>
        </div>

        {/* Referral Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referral Code
          </label>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <code className="text-lg font-mono font-bold text-emerald-600">{referralCode}</code>
            </div>
            <button
              onClick={() => copyToClipboard(referralCode, 'code')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                copied === 'code'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {copied === 'code' ? (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </span>
              ) : (
                'Copy'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">Share on Social Media</p>
        <div className="flex gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Get your car detailed by the best! Use my referral link to book: ${referralLink}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            Twitter
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166fe5] transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent('Check out Emerald Detailing!')}&body=${encodeURIComponent(`I've been using Emerald Detailing and they do amazing work! Use my referral link to book: ${referralLink}`)}`}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </a>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-emerald-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-2">Tips for Success</h3>
        <ul className="text-sm text-emerald-700 space-y-1">
          <li>Share your link on social media after getting your car detailed</li>
          <li>Post before/after photos and tag Emerald Detailing</li>
          <li>Tell friends and family about your positive experience</li>
        </ul>
      </div>
    </div>
  );
}
