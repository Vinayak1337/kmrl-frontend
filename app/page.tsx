"use client";
import { ArrowRight, FileText, Search, Brain, Shield, Users, Bell, Database, Globe, Workflow, Lock } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function Home() {
  const features = [
    {
      icon: Database,
      title: "Self-Hosted Control Center",
      description: "Deploy the dashboard within your network with MongoDB and Prisma tuned for high-volume transport archives.",
    },
    {
      icon: Brain,
      title: "AI Guidance Without Data Leaving",
      description: "Run summarization, translation, and search locally so sensitive records never leave your perimeter.",
    },
    {
      icon: Workflow,
      title: "Operational Workflows Out Of The Box",
      description: "Roll out approval trails, read confirmations, and escalation routes modeled on metro operations.",
    },
    {
      icon: Globe,
      title: "Multilingual Delivery",
      description: "Serve every depot in their language with on-demand translation and localized dashboards.",
    },
    {
      icon: Users,
      title: "Role-Based Experience",
      description: "Provision tailored views for operations, legal, and leadership teams with granular access control.",
    },
    {
      icon: Shield,
      title: "Security and Auditing",
      description: "Hardened authentication, immutable audit trails, and offline-first fallbacks keep regulators satisfied.",
    },
  ];

  const capabilities = [
    {
      icon: FileText,
      title: "Rapid Document Ingestion",
      description: "Bring legacy PDFs, technical drawings, and SOP updates into a unified knowledge layer.",
    },
    {
      icon: Search,
      title: "Semantic Discovery",
      description: "Locate the right procedure instantly with hybrid text + vector search tuned for transport language.",
    },
    {
      icon: Workflow,
      title: "Governed Collaboration",
      description: "Coordinate review cycles and crew acknowledgements with time-bound tasks and reminders.",
    },
    {
      icon: Lock,
      title: "Offline-Ready Compliance",
      description: "Retain full functionality even when offline and sync audit logs once back on the grid.",
    },
    {
      icon: Bell,
      title: "Lifecycle Support",
      description: "We ship continuous improvements while you stay in control of deployment cadence.",
    },
    {
      icon: Brain,
      title: "Insight Dashboards",
      description: "Monitor adoption, risk hotspots, and knowledge gaps with actionable analytics.",
    },
  ];

  // Refs for each section to detect when they enter the viewport
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const capabilitiesRef = useRef(null);
  const ctaRef = useRef(null);

  // useInView hooks to detect when sections are in view
  // No framer-motion in restricted build; using static content

  // Removed animation variables - no framer-motion in restricted build

  return (
    <div className="bg-gradient-to-b from-gray-50 via-blue-50 to-white min-h-screen">
      {/* Hero Section */}
      <section ref={heroRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 shadow-md transform transition-transform hover:scale-105">
              <Database className="w-5 h-5 mr-2" />
              Private deployment package
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">KMRL</span> Document Intelligence, Installed On Your Network
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            Equip your teams with a dedicated dashboard that runs on your hardware. We configure deployment, migrate critical archives, and keep shipping upgrades while you stay in control.
          </p>
          <div className="flex gap-6 justify-center">
            <Link
              href="/request-deployment"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Request Deployment
              <ArrowRight className="ml-3 h-6 w-6 animate-pulse" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full text-gray-800 bg-white border-2 border-gray-200 hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-md"
            >
              Client Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Intelligent Document Management for Modern Organizations
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Leverage cutting-edge AI technologies including OCR, Large Language Models, and semantic search 
            to revolutionize how you handle documents and ensure compliance.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
               
               
               
               
                className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="flex justify-center mb-6">
                  <div
                    className="p-4 bg-blue-50 rounded-full"
                   
                   
                  >
                    <Icon className="h-10 w-10 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Capabilities Section */}
      <section
        ref={capabilitiesRef}
       
       
       
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-12">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Enterprise-Grade Document Intelligence
            </h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Revolutionize your document management with a platform designed for scalability, precision, and compliance. From intelligent ingestion to actionable insights, our system empowers enterprises to streamline workflows and meet regulatory demands effortlessly.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <div
                  key={index}
                 
                 
                  className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex justify-center mb-4">
                    <div
                      className="p-3 bg-blue-100 rounded-full"
                     
                     
                    >
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 text-center">{capability.title}</h4>
                  <p className="text-gray-600 text-center leading-relaxed">{capability.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaRef}
       
       
       
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl px-10 py-16 text-center shadow-2xl">
          <h2 className="text-4xl font-extrabold text-white mb-6 tracking-tight">
            Schedule a Deployment Planning Session
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Share your constraints and we will assemble an installation roadmap, training plan, and support model tailored to your organization.
          </p>
          <div>
            <Link
              href="/request-deployment"
              className="inline-flex items-center px-10 py-4 text-lg font-semibold rounded-full text-blue-800 bg-white hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Request Deployment Plan
              <ArrowRight className="ml-3 h-6 w-6 animate-pulse" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
