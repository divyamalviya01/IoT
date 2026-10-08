import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/shell.tsx", [
    index("routes/home.tsx"),
    route("unit/:unitId", "routes/unit.tsx"),
    route("learn/:topicSlug", "routes/topic.tsx"),
    route("labs", "routes/labs.tsx"),
    route("labs/:labSlug", "routes/lab.tsx"),
    route("quiz/:unitId?", "routes/quiz.tsx"),
    route("viva", "routes/viva.tsx"),
    route("glossary", "routes/glossary.tsx"),
    route("syllabus", "routes/syllabus.tsx"),
    route("*", "routes/not-found.tsx"),
  ]),
  // The lab record is a printable document, so it sits outside the app shell.
  route("labs/:labSlug/record", "routes/lab-record.tsx"),
] satisfies RouteConfig;
