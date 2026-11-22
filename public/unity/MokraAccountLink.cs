// Add to Assets/Scripts/MokraAccountLink.cs in Unity 2022+ or Unity 6.
// Requires TextMeshPro. Attach to a GameObject and assign optional UI / fur renderers.
using System;
using System.Collections;
using System.Text;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;

public class MokraAccountLink : MonoBehaviour
{
    [Header("Mokra website (HTTPS, no trailing slash)")]
    public string WebsiteUrl = "https://YOUR-MOKRA-DOMAIN.com";

    [Header("Optional TextMeshPro labels")]
    public TMP_Text CodeText;
    public TMP_Text StatusText;

    [Header("Optional fur-only renderers")]
    public Renderer[] FurRenderers;

    public string CurrentCode { get; private set; }
    public bool IsLinked { get; private set; }
    public string Username { get; private set; }
    public string DisplayName { get; private set; }
    public int Level { get; private set; }
    public string ParticleMode { get; private set; }
    public int ParticleDensity { get; private set; }

    private string pollToken;
    private string accessToken; // Secret: memory only, never write into logs or PlayerPrefs.
    private Coroutine routine;

    [Serializable] private class GameRequest { public string action; public string deviceName; public string pollToken; }
    [Serializable] private class ApiResponse { public string status; public string code; public string pollToken; public string accessToken; public string error; public int expiresIn; public Player user; }
    [Serializable] private class Player { public string id; public string username; public string displayName; public string furColor; public string particleMode; public int particleDensity; public int level; public int totalRuns; public int shards; }

    public void StartLinking()
    {
        if (routine != null) StopCoroutine(routine);
        routine = StartCoroutine(LinkFlow());
    }

    private IEnumerator LinkFlow()
    {
        IsLinked = false;
        accessToken = null;
        SetStatus("Requesting account link code...");
        using (var request = Post(new GameRequest { action = "start", deviceName = SystemInfo.deviceModel }))
        {
            yield return request.SendWebRequest();
            if (request.result != UnityWebRequest.Result.Success)
            {
                SetStatus("Cannot reach Mokra website.");
                yield break;
            }
            ApiResponse response = JsonUtility.FromJson<ApiResponse>(request.downloadHandler.text);
            if (response == null || string.IsNullOrEmpty(response.code))
            {
                SetStatus(response != null ? response.error : "Pairing unavailable.");
                yield break;
            }
            CurrentCode = response.code;
            pollToken = response.pollToken;
            if (CodeText != null) CodeText.text = CurrentCode;
            SetStatus("Open " + WebsiteUrl + "/account and enter the code.");
        }
        float expiry = Time.realtimeSinceStartup + 600f;
        while (Time.realtimeSinceStartup < expiry)
        {
            yield return new WaitForSecondsRealtime(4f);
            using (var request = Post(new GameRequest { action = "status", pollToken = pollToken }))
            {
                yield return request.SendWebRequest();
                if (request.result != UnityWebRequest.Result.Success) continue;
                ApiResponse result = JsonUtility.FromJson<ApiResponse>(request.downloadHandler.text);
                if (result == null) continue;
                if (result.status == "expired") break;
                if (result.status == "linked" && !string.IsNullOrEmpty(result.accessToken))
                {
                    accessToken = result.accessToken;
                    IsLinked = true;
                    if (CodeText != null) CodeText.text = "LINKED";
                    SetStatus("Account linked. Loading profile...");
                    yield return FetchProfile();
                    yield break;
                }
            }
        }
        if (CodeText != null) CodeText.text = "EXPIRED";
        SetStatus("Your code expired. Request a new one.");
    }

    public void RefreshProfile()
    {
        if (IsLinked && !string.IsNullOrEmpty(accessToken))
            StartCoroutine(FetchProfile());
    }

    private IEnumerator FetchProfile()
    {
        using (var request = Post(new GameRequest { action = "profile" }, accessToken))
        {
            yield return request.SendWebRequest();
            if (request.result != UnityWebRequest.Result.Success)
            {
                IsLinked = false;
                accessToken = null;
                SetStatus("Game session expired or revoked.");
                yield break;
            }
            ApiResponse result = JsonUtility.FromJson<ApiResponse>(request.downloadHandler.text);
            if (result == null || result.user == null) yield break;
            Username = result.user.username;
            DisplayName = result.user.displayName;
            Level = result.user.level;
            ParticleMode = result.user.particleMode;
            ParticleDensity = result.user.particleDensity;
            Color furColor;
            if (ColorUtility.TryParseHtmlString(result.user.furColor, out furColor))
                ApplyFur(furColor);
            SetStatus("Signed in as " + DisplayName);
        }
    }

    private void ApplyFur(Color color)
    {
        if (FurRenderers == null) return;
        foreach (Renderer mesh in FurRenderers)
        {
            if (mesh == null) continue;
            MaterialPropertyBlock block = new MaterialPropertyBlock();
            mesh.GetPropertyBlock(block);
            block.SetColor("_BaseColor", color);
            block.SetColor("_Color", color);
            mesh.SetPropertyBlock(block);
        }
    }

    private UnityWebRequest Post(GameRequest message, string bearer = null)
    {
        var request = new UnityWebRequest(WebsiteUrl.TrimEnd('/') + "/api/game", "POST");
        request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(JsonUtility.ToJson(message)));
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        if (!string.IsNullOrEmpty(bearer))
            request.SetRequestHeader("Authorization", "Bearer " + bearer);
        request.timeout = 15;
        return request;
    }

    private void SetStatus(string status)
    {
        if (StatusText != null) StatusText.text = status;
    }
}
