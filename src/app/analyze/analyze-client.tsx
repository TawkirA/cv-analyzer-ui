"use client"

import { useState } from "react";
import Dropdown from "../components/dropdown";
import CvAnalyzer from "../components/cv-analyzer";

interface ProviderModelConfig {
    models: string[];
    defaultModel: string;
}

interface AnalyzeClientProps {
    providerList: string[];
    providerModels: Record<string, ProviderModelConfig>;
}

export default function AnalyzeClient({ providerList, providerModels }: AnalyzeClientProps) {
    const defaultProvider = providerList[0] ?? "";
    const [provider, setProvider] = useState(defaultProvider);
    const [model, setModel] = useState(providerModels[defaultProvider]?.defaultModel ?? "");
    const [apiKey, setApiKey] = useState("");
    const [serviceKey, setServiceKey] = useState("");
    // Dropdown keeps its own state, so bumping this key remounts it back to its default
    const [resetCount, setResetCount] = useState(0);

    const handleProviderChange = (value: string) => {
        setProvider(value);
        setModel(providerModels[value]?.defaultModel ?? "");
    };

    const handleReset = () => {
        setProvider(defaultProvider);
        setModel(providerModels[defaultProvider]?.defaultModel ?? "");
        setApiKey("");
        setServiceKey("");
        setResetCount((c) => c + 1);
    };

    return (
        <main className="min-w-8xl! mx-auto max-w-10xl! p-8">
            <h1 className="text-2xl font-bold mt-2! mb-2! text-center">Model Config</h1>
            <div className="mt-4 flex items-center gap-4 border-gray-100 p-4!">
                <Dropdown
                    key={`provider-${resetCount}`}
                    options={providerList}
                    defaultVal={provider}
                    onChange={handleProviderChange}
                />
                {/* key forces remount so the dropdown picks up the new provider's default model */}
                <Dropdown
                    key={`model-${provider}-${resetCount}`}
                    options={providerModels[provider]?.models ?? []}
                    defaultVal={model}
                    onChange={setModel}
                />
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Model key"
                    aria-label="Model key"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-md bg-white px-3! py-1! text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
                />
                <input
                    type="password"
                    value={serviceKey}
                    onChange={(e) => setServiceKey(e.target.value)}
                    placeholder="API key"
                    aria-label="API key"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-md bg-white px-3! py-1! text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
                />
                <button
                    type="button"
                    onClick={handleReset}
                    className="w-60 shrink-0 rounded-md bg-white px-4! py-1! font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition"
                >
                    Reset config
                </button>
            </div>
            <CvAnalyzer provider={provider} model={model} apiKey={apiKey} serviceKey={serviceKey} />
        </main>
    );
}
