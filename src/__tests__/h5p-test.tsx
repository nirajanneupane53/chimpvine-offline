export const H5pTest = () => {
  const htmlContent = `<!DOCTYPE html>
    <html>
      <head>
        <title>Simple HTML Table</title>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Smith</td>
              <td>35</td>
              <td>john.smith@example.com</td>
            </tr>
            <tr>
              <td>Jane Doe</td>
              <td>28</td>
              <td>jane.doe@example.com</td>
            </tr>
            <tr>
              <td>Bob Johnson</td>
              <td>42</td>
              <td>bob.johnson@example.com</td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
    `;
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
};
