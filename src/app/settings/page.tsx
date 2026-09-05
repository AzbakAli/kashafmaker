"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [settings, setSettings] = useState({
    defaultTemplateId: "",
    defaultFont: "Helvetica",
    arabicFont: "NotoSansArabic",
  });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "OPERATOR",
  });

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((list) => setTemplates(list.filter((t: { isActive: boolean }) => t.isActive)));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s) {
          setSettings({
            defaultTemplateId: s.defaultTemplateId || "",
            defaultFont: s.defaultFont || "Helvetica",
            arabicFont: s.arabicFont || "NotoSansArabic",
          });
        }
      });
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      });
  }, []);

  const saveSettings = async () => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) toast("Settings saved", "success");
    else toast("Failed to save settings", "error");
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    if (res.ok) {
      toast("User created", "success");
      const u = await res.json();
      setUsers((prev) => [...prev, u]);
      setUserForm({ name: "", email: "", password: "", role: "OPERATOR" });
    } else {
      const err = await res.json();
      toast(err.error || "Failed", "error");
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Settings" description="Company, Kashaf, PDF, and user management" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kashaf Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Default Template"
              value={settings.defaultTemplateId}
              onChange={(e) => setSettings({ ...settings, defaultTemplateId: e.target.value })}
              options={[
                { value: "", label: "None" },
                ...templates.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
            <p className="text-xs text-slate-500">
              Company profile is edited under Companies. That data is injected into Kashaf PDFs automatically.
            </p>
            <Button onClick={saveSettings}>Save Kashaf Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PDF Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Default Font"
              value={settings.defaultFont}
              onChange={(e) => setSettings({ ...settings, defaultFont: e.target.value })}
              options={[
                { value: "Helvetica", label: "Helvetica" },
                { value: "Times", label: "Times" },
                { value: "Courier", label: "Courier" },
              ]}
            />
            <Input
              label="Arabic Font"
              value={settings.arabicFont}
              onChange={(e) => setSettings({ ...settings, arabicFont: e.target.value })}
            />
            <Button onClick={saveSettings}>Save PDF Settings</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createUser} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Input
                label="Name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required
              />
              <Select
                label="Role"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                options={[
                  { value: "ADMIN", label: "Admin" },
                  { value: "MANAGER", label: "Manager" },
                  { value: "OPERATOR", label: "Operator" },
                ]}
              />
              <div className="sm:col-span-4">
                <Button type="submit">Add User</Button>
              </div>
            </form>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="px-4 py-2">{u.name}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
