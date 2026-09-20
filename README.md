# measure-image

## GitHub Pages

The site is deployed automatically by [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) whenever changes are pushed to `master`, including merges into that branch.

In the repository settings, configure **Pages → Build and deployment → Source** as **GitHub Actions**. The deployed URL will be shown in the workflow run and in the `github-pages` environment.

## Local development

Press **F5** in VS Code and select **Measurely: Python web server** if prompted. VS Code starts `python3 -m http.server` on `http://127.0.0.1:8000` and opens the site in the browser debugger.

## Persistence and project files

Enable **Persistent mode** to keep the complete workspace in the browser: imported images, calibrations, measurements, colors, units, and the active image are restored after a reload.

Use **Save project** to download a portable JSON project file containing the images and all measurement data. **Restore project** imports that file and replaces the current workspace.

Very large images may exceed the browser's local storage limit; use **Save project** as an external backup in that case.

Hold **Shift** while drawing or editing a line to constrain it to 0° (horizontal) or 90° (vertical).

Rotate the active image with the left/right quarter-turn buttons or use the rotation slider for any angle. The rotation is kept with the image in persistent mode and in project files.

Use the trash icon above the canvas to remove the active image. The next image is selected automatically, or the empty workspace is shown when no image remains.
# measure-image
