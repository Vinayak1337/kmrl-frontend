"use client";
import { ArrowRight, FileText, Search, Brain, Shield, Users, Bell, Database, Globe, Workflow, Lock } from "lucide-react";
import Link from "next/link";
import { motion, useInView, Easing } from "framer-motion";
import { useRef } from "react";

export default function Home() {
  const features = [
    {
      icon: FileText,
      title: "Intelligent Document Management",
      description: "AI-powered OCR and text extraction from PDFs, images, audio, and video files",
    },
    {
      icon: Search,
      title: "Smart Search & Retrieval",
      description: "Advanced keyword and semantic search capabilities across all your documents",
    },
    {
      icon: Brain,
      title: "AI-Driven Insights",
      description: "Automated document summarization, classification, and content analysis using LLMs",
    },
    {
      icon: Bell,
      title: "Compliance Workflows",
      description: "Approval workflows and notifications to ensure regulatory compliance and acknowledgments",
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Personalized dashboards with document access based on user roles and responsibilities",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Secure document storage with role-based access control and audit trails",
    },
  ];

  const capabilities = [
    {
      icon: Globe,
      title: "Global Language Support",
      description: "Process documents in multiple languages with AI-driven translation and context-aware analysis.",
    },
    {
      icon: FileText,
      title: "Smart Document Ingestion",
      description: "Effortlessly digitize and index documents with high-accuracy OCR and metadata extraction.",
    },
    {
      icon: Workflow,
      title: "Streamlined Workflows",
      description: "Automate document approvals and routing with customizable, compliance-ready workflows.",
    },
    {
      icon: Database,
      title: "Seamless Integrations",
      description: "Integrate with enterprise systems via robust APIs for real-time data synchronization.",
    },
    {
      icon: Brain,
      title: "Insightful Analytics",
      description: "Generate actionable insights with AI-powered analytics and dynamic reporting tools.",
    },
    {
      icon: Lock,
      title: "Regulatory Compliance",
      description: "Ensure adherence to regulations with automated audit trails and compliance tracking.",
    },
  ];

  // Refs for each section to detect when they enter the viewport
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const capabilitiesRef = useRef(null);
  const ctaRef = useRef(null);

  // useInView hooks to detect when sections are in view
  const heroInView = useInView(heroRef, { once: false, amount: 0.3 });
  const featuresInView = useInView(featuresRef, { once: false, amount: 0.2 });
  const capabilitiesInView = useInView(capabilitiesRef, { once: false, amount: 0.2 });
  const ctaInView = useInView(ctaRef, { once: false, amount: 0.3 });

  // Animation variants for Framer Motion with explicit Easing type
  const fadeInDown = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.8, 
        ease: "easeOut" as Easing,
      },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.8, 
        ease: "easeOut" as Easing,
      },
    },
  };

  const slideInLeft = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { 
        duration: 0.8, 
        ease: "easeOut" as Easing,
      },
    },
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 via-blue-50 to-white min-h-screen">
      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        initial="hidden"
        animate={heroInView ? "visible" : "hidden"}
        variants={fadeInDown}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
      >
        <div className="text-center">
          <motion.div variants={fadeInDown} className="mb-8">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 shadow-md transform transition-transform hover:scale-105">
              <Database className="w-5 h-5 mr-2" />
              Kochi Metro Rail Limited
            </span>
          </motion.div>
          <motion.h1 variants={fadeInDown} className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">KMRL</span> Document Intelligence System
          </motion.h1>
          <motion.p variants={fadeInDown} className="text-xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            Transform your document management with AI-powered intelligence. Digitize, summarize, and manage 
            critical documents while ensuring compliance and streamlining workflows across your organization.
          </motion.p>
          <motion.div variants={fadeInDown} className="flex gap-6 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Get Started
              <ArrowRight className="ml-3 h-6 w-6 animate-pulse" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full text-gray-800 bg-white border-2 border-gray-200 hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-md"
            >
              Sign In
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        ref={featuresRef}
        initial="hidden"
        animate={featuresInView ? "visible" : "hidden"}
        variants={fadeInUp}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="text-center mb-16">
          <motion.h2 variants={fadeInUp} className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Intelligent Document Management for Modern Organizations
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Leverage cutting-edge AI technologies including OCR, Large Language Models, and semantic search 
            to revolutionize how you handle documents and ensure compliance.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial="hidden"
                animate={featuresInView ? "visible" : "hidden"}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="flex justify-center mb-6">
                  <motion.div
                    className="p-4 bg-blue-50 rounded-full"
                    whileHover={{ rotate: 12 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon className="h-10 w-10 text-blue-600" />
                  </motion.div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Capabilities Section */}
      <motion.section
        ref={capabilitiesRef}
        initial="hidden"
        animate={capabilitiesInView ? "visible" : "hidden"}
        variants={fadeInUp}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <motion.div variants={fadeInUp} className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-12">
          <div className="text-center mb-12">
            <motion.h3 variants={fadeInUp} className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Enterprise-Grade Document Intelligence
            </motion.h3>
            <motion.p variants={fadeInUp} className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Revolutionize your document management with a platform designed for scalability, precision, and compliance. From intelligent ingestion to actionable insights, our system empowers enterprises to streamline workflows and meet regulatory demands effortlessly.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {capabilities.map((capability, index) => {
              const Icon = capability.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex justify-center mb-4">
                    <motion.div
                      className="p-3 bg-blue-100 rounded-full"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className="h-8 w-8 text-blue-600" />
                    </motion.div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 text-center">{capability.title}</h4>
                  <p className="text-gray-600 text-center leading-relaxed">{capability.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        ref={ctaRef}
        initial="hidden"
        animate={ctaInView ? "visible" : "hidden"}
        variants={fadeInUp}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <motion.div variants={fadeInUp} className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl px-10 py-16 text-center shadow-2xl">
          <motion.h2 variants={fadeInUp} className="text-4xl font-extrabold text-white mb-6 tracking-tight">
            Ready to Transform Your Document Management?
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join modern organizations that are leveraging AI to streamline document workflows, 
            ensure compliance, and unlock insights from their critical information.
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Link
              href="/register"
              className="inline-flex items-center px-10 py-4 text-lg font-semibold rounded-full text-blue-800 bg-white hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Start Your Digital Transformation
              <ArrowRight className="ml-3 h-6 w-6 animate-pulse" />
            </Link>
          </motion.div>
        </motion.div>
      </motion.section>
    </div>
  );
}
