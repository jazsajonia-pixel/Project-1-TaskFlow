import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '../hooks/use-data';
import { api } from '../services/api';
import { PageHeading, Loading, ErrorState, Empty, Pagination } from '../components/common';
import { ActivityFeed } from '../features/activity';
import type { Page, Activity } from '../types';
export default function ActivityPage() {
  const { workspace } = useWorkspace();
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [workspace?.id]);
  const query = useQuery({
    queryKey: ['activity', 'workspace', workspace?.id, page],
    queryFn: () =>
      api<Page<Activity>>(`/workspaces/${workspace!.id}/activity?page=${page}&limit=20`),
    enabled: !!workspace,
  });
  return (
    <>
      <PageHeading
        eyebrow="PROGRESS, TOGETHER"
        title="Team activity"
        description="A shared story of everything your team is moving forward."
      />
      {!workspace ? (
        <Empty title="Your team’s story starts here" description="Create a workspace to begin." />
      ) : query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : query.data.items.length ? (
        <section className="panel activity-page">
          <ActivityFeed items={query.data.items} />
          <Pagination {...query.data} onChange={setPage} />
        </section>
      ) : (
        <Empty
          title="The beginning of something good"
          description="Create a project or task to start your activity history."
        />
      )}
    </>
  );
}
