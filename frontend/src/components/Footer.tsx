import React from "react";
import Link from "next/link";
import { Wrench, Phone, Mail, MapPin, Shield, Zap, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-md shadow-orange-500/20">
                <Wrench className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-2xl font-black text-white font-heading">
                E<span className="text-orange-500">works</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Real-time on-demand home services platform. Connecting verified electricians, plumbers, AC technicians, carpenters, and cleaners with customers in minutes.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
                <Shield className="w-3.5 h-3.5" />
                <span>100% Background-Checked Partners</span>
              </div>
            </div>
          </div>

          {/* Service Categories */}
          <div>
            <h4 className="text-sm font-bold text-white font-semibold uppercase tracking-wider mb-4">
              Services
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/services/electrician" className="hover:text-orange-400 transition-colors">
                  Electrician
                </Link>
              </li>
              <li>
                <Link href="/services/plumber" className="hover:text-orange-400 transition-colors">
                  Plumber
                </Link>
              </li>
              <li>
                <Link href="/services/ac-repair" className="hover:text-orange-400 transition-colors">
                  AC Repair & Service
                </Link>
              </li>
              <li>
                <Link href="/services/carpenter" className="hover:text-orange-400 transition-colors">
                  Carpenter
                </Link>
              </li>
              <li>
                <Link href="/services/appliance-repair" className="hover:text-orange-400 transition-colors">
                  Appliance Repair
                </Link>
              </li>
              <li>
                <Link href="/services/cleaning" className="hover:text-orange-400 transition-colors">
                  Home Deep Cleaning
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white font-semibold uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/services" className="hover:text-orange-400 transition-colors">
                  All Services
                </Link>
              </li>
              <li>
                <Link href="/register/partner" className="hover:text-orange-400 transition-colors">
                  Join as Service Partner
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-orange-400 transition-colors">
                  Customer Login
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-orange-400 transition-colors">
                  How Matching Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-sm font-bold text-white font-semibold uppercase tracking-wider mb-4">
              Contact & Help
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-orange-400" />
                <span>+91 1800-EWORKS (Toll-Free)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-orange-400" />
                <span>support@eworks.local</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span>All Over Tamil Nadu (38 Districts)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Eworks Home Services Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Partner Code of Conduct</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
