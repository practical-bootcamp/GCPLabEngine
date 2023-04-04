using Google.Cloud.Functions.Framework;
using Microsoft.AspNetCore.Http;
using NUnit.Common;
using NUnitLite;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Xml;

namespace Grader;

public class Function : IHttpFunction
{
    public async Task HandleAsync(HttpContext context)
    {

        HttpRequest request = context.Request;
        HttpResponse response = context.Response;

        response.Headers.Append("Access-Control-Allow-Origin", "*");
        response.Headers.Append("Access-Control-Allow-Methods", "GET, POST");
        if (HttpMethods.IsOptions(request.Method))
        {
            response.Headers.Append("Access-Control-Allow-Headers", "Content-Type");
            response.Headers.Append("Access-Control-Max-Age", "3600");
            response.StatusCode = (int)HttpStatusCode.NoContent;
            return;
        }

        Console.WriteLine("Start");
        var strWriter = new StringWriter();
        var autoRun = new AutoRun();
        string trace = ((string)request.Query["trace"]) ?? "Anonymous";
        var isXml = request.Query.ContainsKey("xml");
        string where = ((string)request.Query["where"]) ?? "";
        using TextReader reader = new StreamReader(request.Body);
        string key = await reader.ReadToEndAsync();
        // Console.WriteLine(key);

        var tempDir = Path.GetTempPath();
        var tempCredentialsFilePath = Path.Combine(tempDir, "credentials.json");
        await File.WriteAllTextAsync(tempCredentialsFilePath, key);
        // tempCredentialsFilePath = "/workspaces/GCPLabEngine/functions/grader/key.json";

        var runTestParameters = new List<string>
        {
            "/test:Grader.Tests",
            "--work=" + tempDir,
            "--output=" + tempDir,
            "--err=" + tempDir,
            "--params:CredentialsPath=" + tempCredentialsFilePath + ";trace=" + trace
        };
        if (!string.IsNullOrEmpty(where)) runTestParameters.Insert(1, "--where=" + where);

        Console.WriteLine(String.Join("\n", runTestParameters));
        var returnCode = autoRun.Execute(runTestParameters.ToArray(), new ExtendedTextWrapper(strWriter), Console.In);
        Console.WriteLine(strWriter.ToString());

        var xml = File.ReadAllText(Path.Combine(tempDir, "TestResult.xml"));
        Console.WriteLine(returnCode);

        if (isXml)
        {
            context.Response.ContentType = "text/xml";
            await context.Response.WriteAsync(xml);
        }
        else
        {
            var json = ParseNUnitTestResult(xml);
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(json));
        }

    }

    public static Dictionary<string, int> ParseNUnitTestResult(string rawXml)
    {
        XmlDocument xmlDoc = new XmlDocument();
        xmlDoc.LoadXml(rawXml);
        return ParseNUnitTestResult(xmlDoc);
    }

    private static Dictionary<string, int> ParseNUnitTestResult(XmlDocument xmlDoc)
    {
        var testCases = xmlDoc.SelectNodes("//test-case");
        var result = new Dictionary<string, int>();
        foreach (XmlNode node in testCases)
        {
            result.Add(node.Attributes?["fullname"].Value, node.Attributes?["result"].Value == "Passed" ? 1 : 0);
        }

        return result;
    }
}