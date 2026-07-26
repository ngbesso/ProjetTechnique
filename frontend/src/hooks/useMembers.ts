// useMembers.ts
import { useState, useCallback } from "react";
import type { Member, MemberQuery, MemberUpdateInput } from "../types";
import {
    fetchMembers, approveMember, rejectMember, deactivateMember, activateMember, updateMember,
} from "../lib/api/members";
import { useAsyncList } from "./useAsyncList";

export function useMembers() {
    const [members, setMembers] = useState<Member[]>([]);
    const [total, setTotal] = useState(0);
    const { loading, error, run } = useAsyncList();

    const load = useCallback((query: MemberQuery = {}) => run(async () => {
        const data = await fetchMembers(query);
        setMembers(data.items);
        setTotal(data.total);
    }), [run]);

    const approve = useCallback(async (id: number) => {
        const u = await approveMember(id);
        setMembers((prev) => prev.map((m) => (m.id === u.id ? u : m)));
    }, []);

    const reject = useCallback(async (id: number) => {
        const u = await rejectMember(id);
        setMembers((prev) => prev.map((m) => (m.id === u.id ? u : m)));
    }, []);

    const deactivate = useCallback(async (id: number) => {
        const u = await deactivateMember(id);
        setMembers((prev) => prev.map((m) => (m.id === u.id ? u : m)));
    }, []);

    const activate = useCallback(async (id: number) => {
        const u = await activateMember(id);
        setMembers((prev) => prev.map((m) => (m.id === u.id ? u : m)));
    }, []);

    const edit = useCallback(async (id: number, data: MemberUpdateInput) => {
        const u = await updateMember(id, data);
        setMembers((prev) => prev.map((m) => (m.id === u.id ? u : m)));
        return u;
    }, []);

    return { members, total, loading, error, load, approve, reject, deactivate, activate, edit };
}