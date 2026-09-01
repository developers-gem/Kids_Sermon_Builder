import { Routes, Route } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { AdminRoute } from "./layouts/AdminRoute";
import { NotFoundPage } from "./pages/NotFoundPage";
import { BuilderPage } from "./pages/BuilderPage";
import { CustomStoryPage } from "./pages/CustomStoryPage";
import { LibraryPage } from "./pages/LibraryPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { MyLessonsPage } from "./pages/MyLessonsPage";
import { LessonDetailPage } from "./pages/LessonDetailPage";
import { SharedLessonPage } from "./pages/SharedLessonPage";
import { AdminStoriesPage } from "./pages/AdminStoriesPage";
import { AdminStoryEditorPage } from "./pages/AdminStoryEditorPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import PrivacyPolicy from "./privacyPolicyAndTerms$Conditions/PrivacyPolicy";
import TermsAndConditions from "./privacyPolicyAndTerms$Conditions/TermsAndConditions";
import DeleteUser from "./pages/DeleteUser";
export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<BuilderPage />} />
        <Route path="/create" element={<CustomStoryPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/shared/:token" element={<SharedLessonPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/privacy-policy" element={< PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={< TermsAndConditions />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/my-lessons" element={<MyLessonsPage />} />
          <Route path="/lesson/:id" element={<LessonDetailPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path="/admin/stories" element={<AdminStoriesPage />} />
          <Route path="/admin/stories/new" element={<AdminStoryEditorPage />} />
          <Route path="/admin/stories/:id/edit" element={<AdminStoryEditorPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />}/>
      </Route>
      <Route path="/delete-user" element={<DeleteUser />} />
    </Routes>
  );
}
