"use client";

import { PageHeader, Panel } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/MediaPicker";
import { RequirePermission } from "@/components/admin/AdminShell";
import { isStaff } from "@/lib/admin";

export default function MediaPage() {
  return (
    <RequirePermission allow={isStaff}>
      <PageHeader
        title="Media library"
        description="Every image on the site. Uploads are resized on arrival — thumbnail, medium, large, and a social card — so pages never download an original."
      />
      <Panel>
        <MediaLibrary />
      </Panel>
    </RequirePermission>
  );
}
