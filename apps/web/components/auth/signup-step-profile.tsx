"use client";

import type { Dispatch, SetStateAction } from "react";
import { FormField } from "@/components/molecules/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RadioGroup } from "@/components/ui/radio";
import { clsx } from "clsx";

export interface ProfileData {
  // Farmer
  crops: string[];
  farmSize: string;
  farmSizeUnit: string;
  farmingExperience: string;
  // Buyer
  businessName: string;
  businessType: string;
  commodities: string[];
  purchaseVolume: string;
  // Cooperative
  cooperativeName: string;
  memberCount: string;
  primaryActivities: string[];
  registrationNumber: string;
  // Transporter
  vehicleCount: string;
  vehicleTypes: string[];
  coverageArea: string;
  // Investor
  investorType: string;
  investorInterests: string[];
  investmentRange: string;
  // Extension Agent
  organization: string;
  specializations: string[];
  yearsExperience: string;
}

export const initialProfileData: ProfileData = {
  crops: [],
  farmSize: "",
  farmSizeUnit: "Acres",
  farmingExperience: "",
  businessName: "",
  businessType: "",
  commodities: [],
  purchaseVolume: "",
  cooperativeName: "",
  memberCount: "",
  primaryActivities: [],
  registrationNumber: "",
  vehicleCount: "",
  vehicleTypes: [],
  coverageArea: "",
  investorType: "",
  investorInterests: [],
  investmentRange: "",
  organization: "",
  specializations: [],
  yearsExperience: "",
};

interface Props {
  role: string;
  data: ProfileData;
  onChange: Dispatch<SetStateAction<ProfileData>>;
  errors: Record<string, string>;
}

function ChipSelector({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (chip: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              border: isSelected
                ? "1.5px solid var(--color-brand-600, #2d5a3d)"
                : "1.5px solid var(--color-neutral-200, #e2e0dc)",
              background: isSelected ? "var(--color-brand-600, #2d5a3d)" : "var(--color-neutral-50, #f8f3ea)",
              color: isSelected ? "#fff" : "var(--ink)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {isSelected && <span style={{ fontSize: 12 }}>✓</span>}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function toggleArrayItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

function FarmerProfile({ data, onChange, errors }: Omit<Props, "role">) {
  const cropOptions = [
    "Maize", "Rice", "Cassava", "Yam", "Cocoa", "Soybean",
    "Groundnut", "Millet", "Sorghum", "Tomato", "Pepper",
    "Plantain", "Cowpea", "Oil Palm", "Cashew", "Shea", "Other",
  ];

  return (
    <>
      <FormField label="What crops do you grow?" required error={errors.crops}>
        <ChipSelector
          options={cropOptions}
          selected={data.crops}
          onToggle={(chip) =>
            onChange((prev) => ({ ...prev, crops: toggleArrayItem(prev.crops, chip) }))
          }
        />
      </FormField>

      <FormField label="Farm size" required error={errors.farmSize}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input
            type="number"
            inputSize="lg"
            placeholder="e.g. 5"
            min={0.1}
            step={0.1}
            value={data.farmSize}
            error={Boolean(errors.farmSize)}
            onChange={(e) => onChange((prev) => ({ ...prev, farmSize: e.target.value }))}
            style={{ flex: 1 }}
          />
          <Select
            options={[
              { value: "Acres", label: "Acres" },
              { value: "Hectares", label: "Hectares" },
            ]}
            value={data.farmSizeUnit}
            onChange={(e) => onChange((prev) => ({ ...prev, farmSizeUnit: e.target.value }))}
            style={{ width: 120 }}
          />
        </div>
      </FormField>

      <FormField label="Farming experience" required error={errors.farmingExperience}>
        <RadioGroup
          name="farmingExperience"
          value={data.farmingExperience}
          onChange={(v) => onChange((prev) => ({ ...prev, farmingExperience: v }))}
          options={[
            { value: "lt1", label: "Less than 1 year" },
            { value: "1to5", label: "1 – 5 years" },
            { value: "5to10", label: "5 – 10 years" },
            { value: "gt10", label: "More than 10 years" },
          ]}
        />
      </FormField>
    </>
  );
}

function BuyerProfile({ data, onChange, errors }: Omit<Props, "role">) {
  const commodityOptions = [
    "Maize", "Rice", "Cassava", "Yam", "Cocoa", "Soybean",
    "Groundnut", "Tomato", "Pepper", "Plantain", "Cashew",
    "Shea Butter", "Palm Oil", "Other",
  ];

  return (
    <>
      <FormField label="Business or company name" htmlFor="signup-biz-name" required error={errors.businessName}>
        <Input
          id="signup-biz-name"
          inputSize="lg"
          placeholder="e.g. FreshProduce Ltd."
          value={data.businessName}
          error={Boolean(errors.businessName)}
          onChange={(e) => onChange((prev) => ({ ...prev, businessName: e.target.value }))}
        />
      </FormField>

      <FormField label="Business type" required error={errors.businessType}>
        <Select
          options={[
            { value: "individual", label: "Individual Trader" },
            { value: "retail", label: "Retail Shop" },
            { value: "wholesale", label: "Wholesale" },
            { value: "processing", label: "Processing Company" },
            { value: "export", label: "Export Company" },
            { value: "restaurant", label: "Restaurant / Hotel" },
            { value: "institution", label: "Institution (School, Hospital)" },
            { value: "other", label: "Other" },
          ]}
          placeholder="Select type"
          value={data.businessType}
          error={Boolean(errors.businessType)}
          onChange={(e) => onChange((prev) => ({ ...prev, businessType: e.target.value }))}
        />
      </FormField>

      <FormField label="Which commodities are you interested in?" required error={errors.commodities}>
        <ChipSelector
          options={commodityOptions}
          selected={data.commodities}
          onToggle={(chip) =>
            onChange((prev) => ({ ...prev, commodities: toggleArrayItem(prev.commodities, chip) }))
          }
        />
      </FormField>

      <FormField label="Average monthly purchase volume" required error={errors.purchaseVolume}>
        <Select
          options={[
            { value: "lt1", label: "Less than 1 tonne" },
            { value: "1to10", label: "1 – 10 tonnes" },
            { value: "10to50", label: "10 – 50 tonnes" },
            { value: "50to100", label: "50 – 100 tonnes" },
            { value: "gt100", label: "More than 100 tonnes" },
          ]}
          placeholder="Select volume"
          value={data.purchaseVolume}
          error={Boolean(errors.purchaseVolume)}
          onChange={(e) => onChange((prev) => ({ ...prev, purchaseVolume: e.target.value }))}
        />
      </FormField>
    </>
  );
}

function CooperativeProfile({ data, onChange, errors }: Omit<Props, "role">) {
  return (
    <>
      <FormField label="Cooperative name" htmlFor="signup-coop-name" required error={errors.cooperativeName}>
        <Input
          id="signup-coop-name"
          inputSize="lg"
          placeholder="e.g. Northern Farmers Cooperative"
          value={data.cooperativeName}
          error={Boolean(errors.cooperativeName)}
          onChange={(e) => onChange((prev) => ({ ...prev, cooperativeName: e.target.value }))}
        />
      </FormField>

      <FormField label="Number of members" htmlFor="signup-member-count" required error={errors.memberCount}>
        <Input
          id="signup-member-count"
          type="number"
          inputSize="lg"
          placeholder="e.g. 120"
          min={2}
          value={data.memberCount}
          error={Boolean(errors.memberCount)}
          onChange={(e) => onChange((prev) => ({ ...prev, memberCount: e.target.value }))}
        />
      </FormField>

      <FormField label="Primary activities" required error={errors.primaryActivities}>
        <ChipSelector
          options={[
            "Crop Production", "Livestock", "Processing",
            "Marketing & Sales", "Input Supply", "Training", "Savings & Loans",
          ]}
          selected={data.primaryActivities}
          onToggle={(chip) =>
            onChange((prev) => ({ ...prev, primaryActivities: toggleArrayItem(prev.primaryActivities, chip) }))
          }
        />
      </FormField>

      <FormField label="Registration number (optional)" htmlFor="signup-reg-num">
        <Input
          id="signup-reg-num"
          inputSize="lg"
          placeholder="e.g. REG/COOP/2024/001"
          value={data.registrationNumber}
          onChange={(e) => onChange((prev) => ({ ...prev, registrationNumber: e.target.value }))}
        />
      </FormField>
    </>
  );
}

function TransporterProfile({ data, onChange, errors }: Omit<Props, "role">) {
  return (
    <>
      <FormField label="Number of vehicles" htmlFor="signup-vehicle-count" required error={errors.vehicleCount}>
        <Input
          id="signup-vehicle-count"
          type="number"
          inputSize="lg"
          placeholder="e.g. 3"
          min={1}
          value={data.vehicleCount}
          error={Boolean(errors.vehicleCount)}
          onChange={(e) => onChange((prev) => ({ ...prev, vehicleCount: e.target.value }))}
        />
      </FormField>

      <FormField label="Vehicle types" required error={errors.vehicleTypes}>
        <ChipSelector
          options={[
            "Pickup Truck", "Flatbed Truck", "Refrigerated Truck",
            "Tricycle / Keke", "Motorcycle", "Tractor & Trailer", "Other",
          ]}
          selected={data.vehicleTypes}
          onToggle={(chip) =>
            onChange((prev) => ({ ...prev, vehicleTypes: toggleArrayItem(prev.vehicleTypes, chip) }))
          }
        />
      </FormField>

      <FormField label="Coverage area" required error={errors.coverageArea}>
        <Select
          options={[
            { value: "district", label: "Within my district" },
            { value: "region", label: "Within my region" },
            { value: "nationwide", label: "Nationwide" },
            { value: "crossborder", label: "Cross-border" },
          ]}
          placeholder="Select area"
          value={data.coverageArea}
          error={Boolean(errors.coverageArea)}
          onChange={(e) => onChange((prev) => ({ ...prev, coverageArea: e.target.value }))}
        />
      </FormField>
    </>
  );
}

function InvestorProfile({ data, onChange, errors }: Omit<Props, "role">) {
  return (
    <>
      <FormField label="Investor type" required error={errors.investorType}>
        <Select
          options={[
            { value: "individual", label: "Individual" },
            { value: "company", label: "Company / Fund" },
            { value: "development", label: "Development Organization" },
            { value: "other", label: "Other" },
          ]}
          placeholder="Select type"
          value={data.investorType}
          error={Boolean(errors.investorType)}
          onChange={(e) => onChange((prev) => ({ ...prev, investorType: e.target.value }))}
        />
      </FormField>

      <FormField label="Areas of interest" required error={errors.investorInterests}>
        <ChipSelector
          options={[
            "Crop Production", "Livestock", "Agro-Processing",
            "Logistics & Transport", "AgTech / Technology", "Insurance", "Input Supply",
          ]}
          selected={data.investorInterests}
          onToggle={(chip) =>
            onChange((prev) => ({
              ...prev,
              investorInterests: toggleArrayItem(prev.investorInterests, chip),
            }))
          }
        />
      </FormField>

      <FormField label="Typical investment range" required error={errors.investmentRange}>
        <Select
          options={[
            { value: "lt5k", label: "Under GH₵5,000" },
            { value: "5kto25k", label: "GH₵5,000 – GH₵25,000" },
            { value: "25kto100k", label: "GH₵25,000 – GH₵100,000" },
            { value: "100kto500k", label: "GH₵100,000 – GH₵500,000" },
            { value: "gt500k", label: "Above GH₵500,000" },
          ]}
          placeholder="Select range"
          value={data.investmentRange}
          error={Boolean(errors.investmentRange)}
          onChange={(e) => onChange((prev) => ({ ...prev, investmentRange: e.target.value }))}
        />
      </FormField>
    </>
  );
}

function ExtensionAgentProfile({ data, onChange, errors }: Omit<Props, "role">) {
  return (
    <>
      <FormField label="Organization / Employer" htmlFor="signup-org" required error={errors.organization}>
        <Input
          id="signup-org"
          inputSize="lg"
          placeholder="e.g. Ministry of Food & Agriculture"
          value={data.organization}
          error={Boolean(errors.organization)}
          onChange={(e) => onChange((prev) => ({ ...prev, organization: e.target.value }))}
        />
      </FormField>

      <FormField label="Areas of specialization" required error={errors.specializations}>
        <ChipSelector
          options={[
            "Crop Science", "Soil Science", "Pest & Disease Management",
            "Livestock", "Irrigation", "Post-Harvest Handling",
            "Organic Farming", "Climate-Smart Agriculture",
          ]}
          selected={data.specializations}
          onToggle={(chip) =>
            onChange((prev) => ({
              ...prev,
              specializations: toggleArrayItem(prev.specializations, chip),
            }))
          }
        />
      </FormField>

      <FormField label="Years of experience" required error={errors.yearsExperience}>
        <Select
          options={[
            { value: "lt2", label: "Less than 2 years" },
            { value: "2to5", label: "2 – 5 years" },
            { value: "5to10", label: "5 – 10 years" },
            { value: "gt10", label: "More than 10 years" },
          ]}
          placeholder="Select experience"
          value={data.yearsExperience}
          error={Boolean(errors.yearsExperience)}
          onChange={(e) => onChange((prev) => ({ ...prev, yearsExperience: e.target.value }))}
        />
      </FormField>
    </>
  );
}

const roleHeadings: Record<string, { title: string; subtitle: string }> = {
  farmer: { title: "Tell us about your farm", subtitle: "This helps us personalize your experience" },
  buyer: { title: "Tell us about your business", subtitle: "This helps us match you with the right suppliers" },
  cooperative: { title: "Tell us about your cooperative", subtitle: "This helps us set up your cooperative's workspace" },
  transporter: { title: "Tell us about your transport business", subtitle: "This helps us connect you with the right loads" },
  investor: { title: "Your investment profile", subtitle: "Help us show you the right opportunities" },
  extension_agent: { title: "Your expertise", subtitle: "This helps us match you with farmers who need your skills" },
};

export function SignupStepProfile({ role, data, onChange, errors }: Props) {
  const heading = roleHeadings[role] ?? roleHeadings.farmer;

  return (
    <div className="stack-md">
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
          {heading.title}
        </h3>
        <p style={{ fontSize: "0.9375rem", color: "var(--ink-muted)" }}>
          {heading.subtitle}
        </p>
      </div>

      {role === "farmer" && <FarmerProfile data={data} onChange={onChange} errors={errors} />}
      {role === "buyer" && <BuyerProfile data={data} onChange={onChange} errors={errors} />}
      {role === "cooperative" && <CooperativeProfile data={data} onChange={onChange} errors={errors} />}
      {role === "transporter" && <TransporterProfile data={data} onChange={onChange} errors={errors} />}
      {role === "investor" && <InvestorProfile data={data} onChange={onChange} errors={errors} />}
      {role === "extension_agent" && <ExtensionAgentProfile data={data} onChange={onChange} errors={errors} />}
    </div>
  );
}
