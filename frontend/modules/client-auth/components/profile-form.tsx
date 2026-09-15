"use client";

import { useState } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppFormField } from "@/components/ui/app-form-field";
import { FormRootError } from "@/components/ui/form-root-error";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PsgcCombobox } from "@/modules/client-auth/components/psgc-combobox";
import {
  profileSchema,
  type ProfileFormValues,
  type ProfileValues,
} from "@/modules/client-auth/schemas/profile-schema";
import { updateClientProfile } from "@/modules/client-auth/actions/profile-actions";
import { applyResultErrors } from "@/lib/apply-result-errors";
import { CooldownNotice } from "@/modules/client-auth/components/cooldown-notice";
import { canEditProfile, detailsCooldown } from "@/modules/client-auth/lib/account";
import type { ClientUserProfile } from "@/types/client-user";
import type { PsgcOption } from "@/types/psgc";
import { useResetOnHide } from "@/hooks/use-reset-on-hide";

const DEFAULT_CITIZENSHIP: PsgcOption = { code: "PH", name: "Philippines" };

const SUFFIX_OPTIONS = [
  "Jr.",
  "Sr.",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
] as const;

const GENDER_ITEM_CLASS =
  "h-11 flex-1 gap-2 aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:text-primary aria-pressed:hover:bg-primary/10 aria-pressed:hover:text-primary dark:aria-pressed:bg-primary/10 group-aria-invalid/toggle-group:border-destructive";

// Visual-only radio indicator; selection state/semantics live on the toggle button.
function GenderRadioDot() {
  return (
    <span
      aria-hidden
      className="flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40 transition-colors group-aria-pressed/toggle:border-primary"
    >
      <span className="size-2 scale-0 rounded-full bg-primary transition-transform group-aria-pressed/toggle:scale-100" />
    </span>
  );
}

const PROFILE_FIELDS = [
  "first_name",
  "last_name",
  "middle_name",
  "suffix_name",
  "company_name",
  "birth_date",
  "gender",
  "citizenship_code",
  "region_code",
  "province_code",
  "municipality_code",
  "barangay_code",
  "address_line_one",
  "address_line_two",
  "postal_code",
  "photo_uuid",
] as const;

export function ProfileForm({
  profile,
  onSuccess,
  submitLabel = "Save changes",
}: {
  profile: ClientUserProfile;
  onSuccess: (profile: ClientUserProfile) => void;
  submitLabel?: string;
}) {
  // Details run on their own 30-day clock, separate from the photo's, and the
  // API is the authority on both — nothing is computed here. A suspended
  // account is frozen read-only regardless.
  const cooldown = detailsCooldown(profile);
  const frozen = !canEditProfile(profile);
  const locked = frozen || cooldown.locked;
  const form = useForm<ProfileFormValues, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      middle_name: profile.middle_name ?? "",
      suffix_name: profile.suffix_name ?? "",
      company_name: profile.company_name ?? "",
      birth_date: profile.birth_date ?? "",
      gender: profile.gender === "male" || profile.gender === "female" ? profile.gender : "",
      // Country picker is removed from the UI (citizens registering here are
      // always Philippine-based) — always submit PH regardless of what's on
      // the existing profile.
      citizenship_code: DEFAULT_CITIZENSHIP.code,
      region_code: profile.address?.region?.code ?? "",
      province_code: profile.address?.province?.code ?? "",
      municipality_code: profile.address?.municipality?.code ?? "",
      barangay_code: profile.address?.barangay?.code ?? "",
      address_line_one: profile.address?.line_one ?? "",
      address_line_two: profile.address?.line_two ?? "",
      postal_code: profile.address?.postal_code ?? "",
      photo_uuid: profile.photo?.uuid ?? "",
    },
  });

  const [region, setRegion] = useState<PsgcOption | null>(profile.address?.region ?? null);
  const [province, setProvince] = useState<PsgcOption | null>(profile.address?.province ?? null);
  const [municipality, setMunicipality] = useState<PsgcOption | null>(
    profile.address?.municipality ?? null,
  );
  const [barangay, setBarangay] = useState<PsgcOption | null>(profile.address?.barangay ?? null);

  // Re-seeded from the profile when the route is hidden. All four address
  // mirrors go back with the form, or the comboboxes would keep showing places
  // the reset form fields no longer hold.
  useResetOnHide(() => {
    form.reset();
    setRegion(profile.address?.region ?? null);
    setProvince(profile.address?.province ?? null);
    setMunicipality(profile.address?.municipality ?? null);
    setBarangay(profile.address?.barangay ?? null);
  });
  function handleRegionChange(option: PsgcOption | null) {
    setRegion(option);
    form.setValue("region_code", option?.code ?? "", { shouldValidate: true, shouldDirty: true });
    setProvince(null);
    form.setValue("province_code", "");
    setMunicipality(null);
    form.setValue("municipality_code", "");
    setBarangay(null);
    form.setValue("barangay_code", "");
  }

  function handleProvinceChange(option: PsgcOption | null) {
    setProvince(option);
    form.setValue("province_code", option?.code ?? "", { shouldValidate: true, shouldDirty: true });
    setMunicipality(null);
    form.setValue("municipality_code", "");
    setBarangay(null);
    form.setValue("barangay_code", "");
  }

  function handleMunicipalityChange(option: PsgcOption | null) {
    setMunicipality(option);
    form.setValue("municipality_code", option?.code ?? "", { shouldValidate: true, shouldDirty: true });
    setBarangay(null);
    form.setValue("barangay_code", "");
  }

  function handleBarangayChange(option: PsgcOption | null) {
    setBarangay(option);
    form.setValue("barangay_code", option?.code ?? "", { shouldValidate: true, shouldDirty: true });
  }

  const gender = form.watch("gender");

  async function onSubmit(values: ProfileValues) {
    const result = await updateClientProfile(values);
    if (result.ok) {
      // Re-baselined to the SUBMITTED values, never blanked. One of this
      // form's onSuccess paths only calls router.refresh(), leaving it mounted
      // — so without this it stays permanently dirty. Resetting to `values`
      // rather than to the response also keeps the four address-combobox
      // useState mirrors below in step; resetting to anything else would
      // desync them from the fields they shadow.
      // getValues(), not `values`: the schema's parsed output widens some
      // fields to null, while reset() wants the form's own input shape. The raw
      // field values ARE what was just submitted, so this is the same
      // re-baseline without fighting the transform's types.
      form.reset(form.getValues());
      // PUT /profile's response doesn't reliably echo back resolved
      // relations (country/address parts, photo) the way GET /profile
      // does — override with what's already known locally (selected via
      // the comboboxes/uploader on this very form) so the review step
      // always reflects what was actually chosen, not what the mutation
      // response happened to include.
      onSuccess({
        ...result.data,
        first_name: values.first_name,
        middle_name: values.middle_name,
        last_name: values.last_name,
        suffix_name: values.suffix_name,
        company_name: values.company_name,
        birth_date: values.birth_date,
        gender: values.gender,
        citizenship: DEFAULT_CITIZENSHIP,
        address: {
          country: result.data.address?.country ?? null,
          region,
          province,
          municipality,
          barangay,
          line_one: values.address_line_one,
          line_two: values.address_line_two,
          postal_code: values.postal_code,
        },
      });
      return;
    }
    applyResultErrors(form, result, PROFILE_FIELDS);
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className="space-y-5"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <AppFormField label="First name" isRequired error={form.formState.errors.first_name?.message}>
            <Input className="h-11" {...form.register("first_name")} />
          </AppFormField>
          <AppFormField label="Last name" isRequired error={form.formState.errors.last_name?.message}>
            <Input className="h-11" {...form.register("last_name")} />
          </AppFormField>
          <AppFormField label="Middle name" error={form.formState.errors.middle_name?.message}>
            <Input className="h-11" {...form.register("middle_name")} />
          </AppFormField>
          <Controller
            name="suffix_name"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
              >
                <AppFormField label="Suffix" error={form.formState.errors.suffix_name?.message}>
                  <SelectTrigger className="h-11! w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </AppFormField>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SUFFIX_OPTIONS.map((suffix) => (
                    <SelectItem key={suffix} value={suffix}>
                      {suffix}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <AppFormField
            label="Birth date"
            isRequired
            error={form.formState.errors.birth_date?.message}
          >
            <Input type="date" className="h-11" {...form.register("birth_date")} />
          </AppFormField>
          <AppFormField label="Gender" isRequired error={form.formState.errors.gender?.message}>
            <ToggleGroup
              variant="outline"
              className="w-full"
              value={gender ? [gender] : []}
              onValueChange={(values) => {
                const next = values[0] as "male" | "female" | undefined;
                // required single choice: clicking the selected option must not clear it
                if (!next) return;
                form.setValue("gender", next, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            >
              <ToggleGroupItem value="male" className={GENDER_ITEM_CLASS}>
                <GenderRadioDot />
                Male
              </ToggleGroupItem>
              <ToggleGroupItem value="female" className={GENDER_ITEM_CLASS}>
                <GenderRadioDot />
                Female
              </ToggleGroupItem>
            </ToggleGroup>
          </AppFormField>
        </div>

        <AppFormField
          label="Company name"
          isRequired
          error={form.formState.errors.company_name?.message}
        >
          <Input className="h-11" {...form.register("company_name")} />
        </AppFormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <AppFormField label="Region" isRequired error={form.formState.errors.region_code?.message}>
            <PsgcCombobox
              resource="regions"
              value={region}
              onChange={handleRegionChange}
              placeholder="Search region…"
            />
          </AppFormField>
          <AppFormField
            label="Province"
            userInfo={!region ? "Select a region first" : "Leave blank if not applicable (e.g. NCR)"}
            error={form.formState.errors.province_code?.message}
          >
            <PsgcCombobox
              resource="provinces"
              params={region ? { region_code: region.code } : undefined}
              value={province}
              onChange={handleProvinceChange}
              placeholder="Search province…"
              disabled={!region}
            />
          </AppFormField>
          <AppFormField
            label="City / Municipality"
            isRequired
            userInfo={!region ? "Select a region first" : undefined}
            error={form.formState.errors.municipality_code?.message}
          >
            <PsgcCombobox
              resource="municipalities"
              params={
                region
                  ? { region_code: region.code, ...(province ? { province_code: province.code } : {}) }
                  : undefined
              }
              value={municipality}
              onChange={handleMunicipalityChange}
              placeholder="Search city/municipality…"
              disabled={!region}
            />
          </AppFormField>
          <AppFormField
            label="Barangay"
            isRequired
            userInfo={!municipality ? "Select a city/municipality first" : undefined}
            error={form.formState.errors.barangay_code?.message}
          >
            <PsgcCombobox
              resource="barangays"
              params={
                municipality
                  ? {
                      region_code: region?.code ?? "",
                      ...(province ? { province_code: province.code } : {}),
                      municipality_code: municipality.code,
                    }
                  : undefined
              }
              value={barangay}
              onChange={handleBarangayChange}
              placeholder="Search barangay…"
              disabled={!municipality}
            />
          </AppFormField>
        </div>

        <AppFormField
          label="Address line 1"
          isRequired
          error={form.formState.errors.address_line_one?.message}
        >
          <Input
            className="h-11"
            placeholder="House/unit no., street, subdivision"
            {...form.register("address_line_one")}
          />
        </AppFormField>
        <AppFormField label="Address line 2" error={form.formState.errors.address_line_two?.message}>
          <Input className="h-11" {...form.register("address_line_two")} />
        </AppFormField>
        <AppFormField
          label="Postal code"
          isRequired
          error={form.formState.errors.postal_code?.message}
        >
          <Input className="h-11" {...form.register("postal_code")} />
        </AppFormField>

        <FormRootError />
        {locked ? (
          <div className="space-y-2">
            {frozen ? (
              <p
                role="status"
                className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                Your account is suspended, so your details can&apos;t be changed.
              </p>
            ) : (
              <CooldownNotice cooldown={cooldown} what="details" />
            )}
            <FormSubmitButton className="h-10 w-full" disabled>
              {submitLabel}
            </FormSubmitButton>
          </div>
        ) : (
          <FormSubmitButton className="h-10 w-full">{submitLabel}</FormSubmitButton>
        )}
      </form>
    </FormProvider>
  );
}
