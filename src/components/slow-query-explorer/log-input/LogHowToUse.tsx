import { CircleHelp, Download, FileText, Lock } from "lucide-react";
import { Disclosure } from "#components/common/Disclosure";
import { Icon } from "#components/common/Icon";
import { LabeledSnippet } from "#components/common/LabeledSnippet";
import { ExternalLink } from "#components/shared/ExternalLink";

export function LogHowToUse() {
  return (
    <div className="container-secondary">
      <div className="mb-3 flex items-start gap-3">
        <Icon icon={CircleHelp} variant="primary" />
        <p className="flex-1 text-sm text-neutral-700 dark:text-neutral-300">
          Load MongoDB slow query logs to analyze and visualize slow queries.
        </p>
      </div>
      <Disclosure icon={FileText} label="What are MongoDB slow query logs?">
        <p>
          MongoDB logs operations that take longer than the configured{" "}
          <code>slowms</code> threshold (100 ms by default). See{" "}
          <ExternalLink href="https://www.mongodb.com/docs/manual/tutorial/find-slow-queries-with-database-profiler/">
            Find Slow Queries
          </ExternalLink>{" "}
          for more information.
        </p>
      </Disclosure>
      <Disclosure icon={Download} label="How do I get MongoDB logs?">
        <LabeledSnippet
          label="Atlas"
          link={{
            href: "https://www.mongodb.com/docs/atlas/mongodb-logs/",
            label: "Atlas docs",
          }}
        >
          Cluster › … › Download Logs › mongodb.log
        </LabeledSnippet>
        <LabeledSnippet label="Self-hosted">
          /var/log/mongodb/mongod.log
        </LabeledSnippet>
      </Disclosure>
      <Disclosure icon={Lock} label="Privacy">
        <p>
          All parsing happens in your browser. Nothing is sent to the server or
          saved.
        </p>
      </Disclosure>
    </div>
  );
}
