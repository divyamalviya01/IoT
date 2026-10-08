import { ButtonLink } from "~/components/ui/Button";
import { href } from "~/content/registry";
import { Page } from "./Page";

export function NotFoundMessage({ what = "page" }: { what?: string }) {
  return (
    <Page>
      <h1 className="text-h1 font-bold">This {what} doesn’t exist</h1>
      <p className="mt-3 max-w-[60ch] text-ink-2">
        The address may have a typo, or the {what} may have moved. Pick a topic from the syllabus
        instead.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink to={href.home()} variant="primary">
          Go to the home page
        </ButtonLink>
        <ButtonLink to={href.syllabus()}>See the full syllabus</ButtonLink>
      </div>
    </Page>
  );
}
